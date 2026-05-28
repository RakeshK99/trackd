// AgentMail message.received webhook handler.
// 1. Verify Svix signature
// 2. Dedup on agentmail_message_id
// 3. Classify with Claude Sonnet (JSON output)
// 4. Fuzzy-match company via pg_trgm RPC
// 5. Update applications.status, append timeline event, push notification
// 6. Always record raw email_event for audit
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifySvix } from '../_shared/svix.ts';
import { sendPushToUser } from '../_shared/push.ts';

const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const STATUS_MAP: Record<string, string> = {
  phone_screen: 'phone_screen',
  interview_scheduled: 'interview',
  offer: 'offer',
  rejected: 'rejected',
  waitlisted: 'applied',
};

interface Classification {
  company: string | null;
  status:
    | 'phone_screen'
    | 'interview_scheduled'
    | 'offer'
    | 'rejected'
    | 'waitlisted'
    | 'unknown';
  confidence: number;
}

async function classify(subject: string, from: string, body: string): Promise<Classification> {
  const res = await claude.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 160,
    system:
      'You are a job application email classifier. Return ONLY valid JSON. No markdown, no explanation. Use null for unknown fields.',
    messages: [
      {
        role: 'user',
        content:
          `Subject: ${subject}\nFrom: ${from}\nBody: ${body.slice(0, 800)}\n\n` +
          `Return this exact schema: {"company": string|null, "status": "phone_screen"|"interview_scheduled"|"offer"|"rejected"|"waitlisted"|"unknown", "confidence": number}`,
      },
    ],
  });
  const text = (res.content[0] as { type: string; text: string }).text;
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  let payload: any;
  try {
    payload = await verifySvix(req);
  } catch (err) {
    console.error('svix verify failed', err);
    return new Response('invalid signature', { status: 401 });
  }

  if (payload.event_type !== 'message.received') return new Response('ok');
  const msg = payload.message ?? payload.data?.message ?? payload.data;
  if (!msg?.message_id) return new Response('ok');

  // Idempotency
  const { data: exists } = await supabaseAdmin
    .from('email_events')
    .select('id')
    .eq('agentmail_message_id', msg.message_id)
    .maybeSingle();
  if (exists) return new Response('ok');

  // Resolve user from inbox_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('agentmail_inbox_id', msg.inbox_id)
    .maybeSingle();
  if (!user) return new Response('ok');

  const fromAddr = Array.isArray(msg.from_) ? msg.from_[0] : msg.from ?? '';
  const subject = msg.subject ?? '';
  const body = msg.text ?? msg.preview ?? '';

  let classification: Classification;
  try {
    classification = await classify(subject, fromAddr, body);
  } catch (err) {
    console.error('claude classify failed', err);
    classification = { company: null, status: 'unknown', confidence: 0 };
  }

  // Fuzzy-match application
  let appId: string | null = null;
  let prevStatus: string | null = null;
  if (classification.company && classification.confidence >= 0.6) {
    const { data: match } = await supabaseAdmin.rpc('match_application', {
      p_user_id: user.id,
      p_company: classification.company,
    });
    const m = Array.isArray(match) ? match[0] : match;
    if (m) {
      appId = m.id;
      prevStatus = m.status;
    }
  }

  const mappedStatus = STATUS_MAP[classification.status];
  if (appId && mappedStatus && classification.status !== 'unknown') {
    await supabaseAdmin
      .from('applications')
      .update({ status: mappedStatus, last_activity: new Date().toISOString() })
      .eq('id', appId);

    await supabaseAdmin.from('timeline_events').insert({
      application_id: appId,
      user_id: user.id,
      event_type: 'email_received',
      old_status: prevStatus,
      new_status: mappedStatus,
      email_subject: subject,
      email_from: fromAddr,
    });

    await sendPushToUser(
      user.id,
      'Trackd',
      `${classification.company} moved to ${mappedStatus.replace('_', ' ')}`,
      { application_id: appId },
    );
  }

  await supabaseAdmin.from('email_events').insert({
    agentmail_message_id: msg.message_id,
    user_id: user.id,
    application_id: appId,
    from_address: fromAddr,
    subject,
    body_preview: body.slice(0, 500),
    classified_status: mappedStatus ?? null,
    classified_company: classification.company,
    confidence: classification.confidence,
  });

  return new Response('ok');
});
