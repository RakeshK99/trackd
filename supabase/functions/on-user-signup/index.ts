// Provisions an AgentMail pod + inbox for a new user, then stores
// inbox details on public.users. Triggered by a Supabase Auth webhook
// or invoked directly from the client immediately after sign-up.
//
// Required env: AGENTMAIL_API_KEY, AGENTMAIL_DOMAIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { am, AGENTMAIL_DOMAIN as DOMAIN } from '../_shared/agentmail.ts';

function safeUsername(email: string, userId: string) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  // Append last 4 of user id to avoid collisions across users.
  return `${base || 'user'}-${userId.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let userId: string | undefined;
  let email: string | undefined;
  let displayName: string | undefined;
  try {
    const body = await req.json();
    // Accept either Supabase Auth webhook shape { record: { id, email, ... } }
    // or a direct call shape { user_id, email, display_name }.
    if (body.record) {
      userId = body.record.id;
      email = body.record.email;
      displayName = body.record.raw_user_meta_data?.display_name;
    } else {
      userId = body.user_id;
      email = body.email;
      displayName = body.display_name;
    }
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!userId || !email) return new Response('missing user_id/email', { status: 400 });

  // Already provisioned? bail early.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('agentmail_inbox_id')
    .eq('id', userId)
    .single();
  if (existing?.agentmail_inbox_id) return new Response('ok');

  const username = safeUsername(email, userId);

  // 1. Pod for tenant isolation.
  const pod = await am('/pods', {
    method: 'POST',
    body: JSON.stringify({ client_id: userId }),
  });

  // 2. Inbox on configured domain. client_id makes this idempotent — if this
  // function is invoked twice concurrently for the same user (e.g. the
  // post-signup call and the onboarding-screen mount effect both firing),
  // AgentMail returns the same inbox instead of provisioning two.
  const inbox = await am(`/pods/${pod.pod_id}/inboxes`, {
    method: 'POST',
    body: JSON.stringify({
      username,
      domain: DOMAIN,
      display_name: displayName ?? username,
      client_id: userId,
    }),
  });

  // NOTE: We do NOT create a per-inbox webhook here. A single account-level
  // webhook (configured once in the AgentMail dashboard -> Webhooks, pointing
  // at .../functions/v1/process-email) catches message.received for every
  // inbox and shares ONE signing secret (AGENTMAIL_WEBHOOK_SECRET). This keeps
  // signature verification simple. process-email resolves the user from
  // msg.inbox_id, so a global webhook is sufficient.

  // 3. Persist on users row.
  await supabaseAdmin
    .from('users')
    .update({
      agentmail_pod_id: pod.pod_id,
      agentmail_inbox_id: inbox.inbox_id,
      trackd_email: `${username}@${DOMAIN}`,
      display_name: displayName ?? username,
    })
    .eq('id', userId);

  return new Response(JSON.stringify({ trackd_email: `${username}@${DOMAIN}` }), {
    headers: { 'content-type': 'application/json' },
  });
});
