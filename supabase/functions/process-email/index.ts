// AgentMail message.received webhook handler.
//
// This version is DEFENSIVE + SELF-LOGGING because AgentMail's exact webhook
// payload shape isn't pinned down in our copy of their docs. It:
//   1. Logs the raw body + headers (visible in Supabase function logs)
//   2. Verifies the Svix signature when possible (bypassable via env flag
//      WEBHOOK_DEBUG_BYPASS_SIGNATURE=true while we confirm wiring)
//   3. Parses event type + message across multiple possible field names
//   4. Classifies with Claude, fuzzy-matches, updates, and ALWAYS records an
//      email_event row (even when unmatched) so nothing is silently dropped
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendPushToUser } from '../_shared/push.ts';
import { Webhook } from 'npm:svix@1.29.0';

const claude = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const STATUS_MAP: Record<string, string> = {
  phone_screen: 'phone_screen',
  interview_scheduled: 'interview',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
  waitlisted: 'applied',
  applied: 'applied',
};

interface Classification {
  company: string | null;
  status:
    | 'phone_screen'
    | 'interview_scheduled'
    | 'offer'
    | 'rejected'
    | 'waitlisted'
    | 'applied'
    | 'unknown';
  confidence: number;
}

function pick<T = unknown>(obj: Record<string, unknown> | undefined, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function firstEmail(v: unknown): string {
  if (!v) return '';
  if (Array.isArray(v)) return String(v[0] ?? '');
  return String(v);
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
          `Return this exact schema: {"company": string|null, "status": "phone_screen"|"interview_scheduled"|"offer"|"rejected"|"waitlisted"|"applied"|"unknown", "confidence": number}`,
      },
    ],
  });
  const text = (res.content[0] as { type: string; text: string }).text;
  // Strip accidental markdown fences if the model adds them.
  const clean = text.replace(/```json\s*|\s*```/g, '').trim();
  return JSON.parse(clean);
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  console.log('=== process-email invoked ===');
  console.log('headers:', JSON.stringify(headers));
  console.log('rawBody:', rawBody.slice(0, 2000));

  // --- Signature verification (bypassable while debugging wiring) ---
  const bypass = Deno.env.get('WEBHOOK_DEBUG_BYPASS_SIGNATURE') === 'true';
  const secret = Deno.env.get('AGENTMAIL_WEBHOOK_SECRET');
  if (!bypass && secret) {
    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        'svix-id': req.headers.get('svix-id') ?? req.headers.get('webhook-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? req.headers.get('webhook-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? req.headers.get('webhook-signature') ?? '',
      });
      console.log('svix signature: OK');
    } catch (err) {
      console.error('svix signature FAILED:', String(err));
      return new Response('invalid signature', { status: 401 });
    }
  } else {
    console.log('svix verification skipped (bypass=%s, secretPresent=%s)', bypass, !!secret);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('body is not JSON');
    return new Response('ok');
  }

  // --- Resolve event type across possible field names ---
  const eventType = pick<string>(payload, 'event_type', 'type', 'event');
  console.log('eventType:', eventType);
  if (eventType && !String(eventType).includes('message') && !String(eventType).includes('received')) {
    console.log('ignoring non-message event');
    return new Response('ok');
  }

  // --- Resolve the message object across possible nestings ---
  const msg =
    (pick<Record<string, unknown>>(payload, 'message', 'data')) ??
    payload; // some providers send the message at root
  const innerMsg = (pick<Record<string, unknown>>(msg, 'message')) ?? msg;

  const messageId = pick<string>(innerMsg, 'message_id', 'id', 'messageId');
  const inboxId = pick<string>(innerMsg, 'inbox_id', 'inboxId') ?? pick<string>(msg, 'inbox_id', 'inboxId');
  const fromAddr = firstEmail(pick(innerMsg, 'from_', 'from', 'sender'));
  const subject = pick<string>(innerMsg, 'subject') ?? '';
  const body =
    pick<string>(innerMsg, 'text', 'extracted_text', 'extractedText', 'preview', 'body') ?? '';

  console.log('parsed:', JSON.stringify({ messageId, inboxId, fromAddr, subject, bodyLen: body.length }));

  if (!messageId) {
    console.error('no message id found — cannot dedup; aborting');
    return new Response('ok');
  }
  if (!inboxId) {
    console.error('no inbox id found — cannot resolve user; aborting');
    return new Response('ok');
  }

  // Idempotency
  const { data: exists } = await supabaseAdmin
    .from('email_events')
    .select('id')
    .eq('agentmail_message_id', messageId)
    .maybeSingle();
  if (exists) {
    console.log('already processed', messageId);
    return new Response('ok');
  }

  // Resolve user from inbox_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('agentmail_inbox_id', inboxId)
    .maybeSingle();
  if (!user) {
    console.error('no user for inbox_id', inboxId);
    return new Response('ok');
  }

  // Classify
  let classification: Classification;
  try {
    classification = await classify(subject, fromAddr, body);
    console.log('classification:', JSON.stringify(classification));
  } catch (err) {
    console.error('claude classify failed:', String(err));
    classification = { company: null, status: 'unknown', confidence: 0 };
  }

  // Fuzzy-match application
  let appId: string | null = null;
  let prevStatus: string | null = null;
  if (classification.company && classification.confidence >= 0.6) {
    const { data: match, error: matchErr } = await supabaseAdmin.rpc('match_application', {
      p_user_id: user.id,
      p_company: classification.company,
    });
    if (matchErr) console.error('match_application error:', matchErr.message);
    const m = Array.isArray(match) ? match[0] : match;
    if (m) {
      appId = m.id;
      prevStatus = m.status;
      console.log('matched application', appId, 'company', m.company);
    } else {
      console.log('no application matched company', classification.company);
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
    console.log('updated application', appId, '->', mappedStatus);
  } else {
    console.log('no status update applied (appId=%s, mappedStatus=%s)', appId, mappedStatus);
  }

  // Always record the raw email event for audit / unmatched review.
  const { error: insErr } = await supabaseAdmin.from('email_events').insert({
    agentmail_message_id: messageId,
    user_id: user.id,
    application_id: appId,
    from_address: fromAddr,
    subject,
    body_preview: body.slice(0, 500),
    classified_status: mappedStatus ?? null,
    classified_company: classification.company,
    confidence: classification.confidence,
  });
  if (insErr) console.error('email_events insert error:', insErr.message);

  console.log('=== process-email done ===');
  return new Response('ok');
});
