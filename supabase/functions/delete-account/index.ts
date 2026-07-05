// Deletes the calling user's account entirely: deprovisions their AgentMail
// pod/inbox, then deletes the auth.users row. That cascades to public.users
// (FK ON DELETE CASCADE) and everything owned by it — applications,
// timeline_events, email_events, push_tokens — so a single admin delete
// call is enough to remove all of a user's data.
//
// Deployed WITH JWT verification (no --no-verify-jwt): this must only ever
// act on the calling user's own account, identified from their own session
// token, never from a client-supplied user_id.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { am } from '../_shared/agentmail.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('missing authorization', { status: 401 });

  const supabaseAsUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await supabaseAsUser.auth.getUser();
  if (userErr || !user) return new Response('invalid session', { status: 401 });

  // Best-effort AgentMail cleanup — a flaky external API shouldn't block the
  // user from deleting their account and data.
  const { data: row } = await supabaseAdmin
    .from('users')
    .select('agentmail_pod_id, agentmail_inbox_id')
    .eq('id', user.id)
    .maybeSingle();

  if (row?.agentmail_pod_id && row?.agentmail_inbox_id) {
    try {
      await am(`/pods/${row.agentmail_pod_id}/inboxes/${row.agentmail_inbox_id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('agentmail inbox delete failed:', String(err));
    }
    try {
      await am(`/pods/${row.agentmail_pod_id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('agentmail pod delete failed:', String(err));
    }
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('auth.admin.deleteUser failed:', delErr.message);
    return new Response(delErr.message, { status: 500 });
  }

  console.log('deleted account', user.id);
  return new Response('ok');
});
