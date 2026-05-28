// Nightly cron — flag applications silent for 14+ days as ghosted.
// Schedule via Supabase: pg_cron OR the dashboard scheduler hitting this URL.
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendBatch } from '../_shared/push.ts';

Deno.serve(async () => {
  const { data: stale, error } = await supabaseAdmin
    .from('applications')
    .select('id, user_id, company, role, status')
    .eq('archived', false)
    .not('status', 'in', '("offer","rejected","withdrawn","ghosted")')
    .lt('last_activity', new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString());

  if (error) return new Response(error.message, { status: 500 });
  if (!stale || stale.length === 0) return new Response(JSON.stringify({ flagged: 0 }));

  const ids = stale.map((a) => a.id);
  await supabaseAdmin.from('applications').update({ status: 'ghosted' }).in('id', ids);

  await supabaseAdmin.from('timeline_events').insert(
    stale.map((a) => ({
      application_id: a.id,
      user_id: a.user_id,
      event_type: 'ghost_flagged',
      old_status: a.status,
      new_status: 'ghosted',
    })),
  );

  // Batch push by user
  const byUser: Record<string, typeof stale> = {};
  for (const a of stale) (byUser[a.user_id] ||= []).push(a);

  const messages: { to: string; title: string; body: string; sound: 'default' }[] = [];
  for (const [userId, apps] of Object.entries(byUser)) {
    const { data: tokens } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);
    if (!tokens) continue;
    const body = apps.length === 1
      ? `${apps[0].company} has gone quiet. Follow up?`
      : `${apps.length} applications have gone quiet.`;
    for (const t of tokens) {
      messages.push({ to: t.token, title: 'Ghost alert', body, sound: 'default' });
    }
  }
  if (messages.length) await sendBatch(messages);

  return new Response(JSON.stringify({ flagged: stale.length }));
});
