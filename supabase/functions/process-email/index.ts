// AgentMail message.received webhook handler.
//
// This version is DEFENSIVE + SELF-LOGGING because AgentMail's exact webhook
// payload shape isn't pinned down in our copy of their docs. It:
//   1. Logs the raw body + headers (visible in Supabase function logs)
//   2. Verifies the Svix signature when possible (bypassable via env flag
//      WEBHOOK_DEBUG_BYPASS_SIGNATURE=true while we confirm wiring)
//   3. Parses event type + message across multiple possible field names
//   4. Classifies with Claude, fuzzy-matches against existing applications,
//      updates status on a match — or, for a fresh "application received"
//      confirmation with no match, creates the application (so applying
//      somewhere outside Trackd still gets tracked) — and ALWAYS records an
//      email_event row (even when unmatched) so nothing is silently dropped
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendPushToUser } from '../_shared/push.ts';
import { verifySvix } from '../_shared/svix.ts';

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
  role: string | null;
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

// AgentMail's message.received payload sends `from` as "Display Name <email@domain.com>".
function extractEmailAddress(s: string): string {
  const m = s.match(/<([^<>]+)>/);
  return (m ? m[1] : s).trim();
}

function firstEmail(v: unknown): string {
  if (!v) return '';
  if (Array.isArray(v)) return firstEmail(v[0]);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return firstEmail(o.email ?? o.address ?? o.value ?? '');
  }
  return extractEmailAddress(String(v));
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
          `Return this exact schema: {"company": string|null, "role": string|null, "status": "phone_screen"|"interview_scheduled"|"offer"|"rejected"|"waitlisted"|"applied"|"unknown", "confidence": number}\n` +
          `"role" is the job title/position mentioned (e.g. "Software Engineer Intern"), or null if not stated. ` +
          `Use status "applied" for an automated "we received your application" / "thanks for applying" confirmation, not just any update.`,
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

  // --- Signature verification. Fails closed: missing/misconfigured secret
  // rejects the request rather than silently skipping verification. ---
  try {
    await verifySvix(rawBody, req.headers);
    console.log('svix signature: OK (or bypass explicitly enabled)');
  } catch (err) {
    console.error('svix signature FAILED:', String(err));
    return new Response('invalid signature', { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('body is not JSON');
    return new Response('ok');
  }

  // AgentMail's payload shape (confirmed): { type: "event", event_type: "message.received", ... }.
  // Only "message.received" is expected — the account-level webhook is subscribed to that
  // event type alone, so anything else (message.sent/.bounced/.received.spam etc., which
  // require explicit opt-in) indicates misconfiguration and should be dropped, not processed
  // as a new inbound recruiter email.
  const eventType = pick<string>(payload, 'event_type', 'type', 'event');
  console.log('eventType:', eventType);
  if (eventType && String(eventType).toLowerCase() !== 'message.received') {
    console.log('ignoring non-message.received event:', eventType);
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

  // Idempotency: claim this message atomically via the unique constraint on
  // agentmail_message_id. A concurrent/retried delivery for the same message
  // will fail this insert with a unique violation instead of racing past a
  // separate select-then-check (which two concurrent requests could both pass).
  const { error: claimErr } = await supabaseAdmin.from('email_events').insert({
    agentmail_message_id: messageId,
    user_id: user.id,
  });
  if (claimErr) {
    if (claimErr.code === '23505') {
      console.log('already processed (claim lost)', messageId);
      return new Response('ok');
    }
    console.error('email_events claim insert error:', claimErr.message);
    return new Response('ok');
  }

  // Classify
  let classification: Classification;
  try {
    classification = await classify(subject, fromAddr, body);
    console.log('classification:', JSON.stringify(classification));
  } catch (err) {
    console.error('claude classify failed:', String(err));
    classification = { company: null, role: null, status: 'unknown', confidence: 0 };
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

    // The update above already fired trg_log_status_change, which inserted a
    // 'status_change' timeline_events row. Enrich that same row with the
    // email context instead of inserting a second row for one transition.
    const { data: trigRow } = await supabaseAdmin
      .from('timeline_events')
      .select('id')
      .eq('application_id', appId)
      .eq('event_type', 'status_change')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (trigRow) {
      await supabaseAdmin
        .from('timeline_events')
        .update({ event_type: 'email_received', email_subject: subject, email_from: fromAddr })
        .eq('id', trigRow.id);
    }

    await sendPushToUser(
      user.id,
      'Trackd',
      `${classification.company} moved to ${mappedStatus.replace('_', ' ')}`,
      { application_id: appId },
    );
    console.log('updated application', appId, '->', mappedStatus);
  } else if (
    !appId &&
    classification.status === 'applied' &&
    classification.confidence >= 0.6 &&
    classification.company
  ) {
    // No existing application matched at the normal threshold, but this
    // reads as a fresh "application received" confirmation. Before
    // creating, guard against a near-duplicate: a normalized-suffix
    // mismatch (e.g. "Meta" vs "Meta Platforms Inc" — similarity 0.33,
    // below the 0.45 match threshold but clearly not nothing) likely means
    // this is the same company under a different name, so skip creating
    // rather than risk a visible duplicate in the pipeline.
    const { data: looseMatch, error: looseErr } = await supabaseAdmin.rpc('match_application', {
      p_user_id: user.id,
      p_company: classification.company,
      p_threshold: 0.3,
    });
    if (looseErr) console.error('loose match_application error:', looseErr.message);
    const loose = Array.isArray(looseMatch) ? looseMatch[0] : looseMatch;

    if (loose) {
      console.log('skipping auto-create: possible near-duplicate of', loose.company, 'sim', loose.sim);
    } else {
      // The company/role likely was never added to Trackd manually
      // (applied via LinkedIn, a careers page, etc.), so create it
      // instead of silently dropping the email.
      const { data: created, error: createErr } = await supabaseAdmin
        .from('applications')
        .insert({
          user_id: user.id,
          company: classification.company,
          role: classification.role?.trim() || 'Role not specified',
          status: 'applied',
        })
        .select()
        .single();

      if (createErr) {
        console.error('auto-create application failed:', createErr.message);
      } else if (created) {
        appId = created.id;
        console.log('auto-created application', appId, 'for company', classification.company);

        // INSERT doesn't fire trg_log_status_change (update-only), so log
        // the creation explicitly rather than relying on the trigger.
        await supabaseAdmin.from('timeline_events').insert({
          application_id: appId,
          user_id: user.id,
          event_type: 'created',
          new_status: 'applied',
          email_subject: subject,
          email_from: fromAddr,
        });

        await sendPushToUser(
          user.id,
          'Trackd',
          `${classification.company} added to your pipeline`,
          { application_id: appId },
        );
      }
    }
  } else {
    console.log('no status update applied (appId=%s, mappedStatus=%s)', appId, mappedStatus);
  }

  // Fill in the audit row claimed earlier with the classification results.
  const { error: updErr } = await supabaseAdmin
    .from('email_events')
    .update({
      application_id: appId,
      from_address: fromAddr,
      subject,
      body_preview: body.slice(0, 500),
      classified_status: mappedStatus ?? null,
      classified_company: classification.company,
      confidence: classification.confidence,
    })
    .eq('agentmail_message_id', messageId);
  if (updErr) console.error('email_events update error:', updErr.message);

  console.log('=== process-email done ===');
  return new Response('ok');
});
