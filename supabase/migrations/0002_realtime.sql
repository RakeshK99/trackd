-- Ensure server-side changes (e.g. from the email pipeline Edge Function)
-- are broadcast to subscribed clients. Without membership in the
-- supabase_realtime publication, postgres_changes events never fire.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'timeline_events'
  ) then
    alter publication supabase_realtime add table public.timeline_events;
  end if;
end $$;
