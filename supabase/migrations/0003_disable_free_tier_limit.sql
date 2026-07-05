-- Temporarily disable the free-tier 15-active-application cap while the app
-- has no meaningful traffic yet. Keeps active_app_count maintenance intact
-- (still incremented/decremented on insert/archive/restore/delete) so the
-- cap can be re-enabled later by restoring the two `raise exception` checks
-- below (see the commented-out originals) without needing to backfill counts.

create or replace function public.enforce_active_app_limit()
returns trigger language plpgsql as $$
declare
  v_plan text;
  v_count int;
begin
  select plan, active_app_count into v_plan, v_count
  from public.users where id = new.user_id for update;

  if tg_op = 'INSERT' and new.archived = false then
    -- if v_plan = 'free' and v_count >= 15 then
    --   raise exception 'FREE_TIER_LIMIT' using errcode = 'P0001';
    -- end if;
    update public.users set active_app_count = active_app_count + 1 where id = new.user_id;
  elsif tg_op = 'UPDATE' then
    if old.archived = false and new.archived = true then
      update public.users set active_app_count = greatest(active_app_count - 1, 0) where id = new.user_id;
    elsif old.archived = true and new.archived = false then
      -- if v_plan = 'free' and v_count >= 15 then
      --   raise exception 'FREE_TIER_LIMIT' using errcode = 'P0001';
      -- end if;
      update public.users set active_app_count = active_app_count + 1 where id = new.user_id;
    end if;
  elsif tg_op = 'DELETE' and old.archived = false then
    update public.users set active_app_count = greatest(active_app_count - 1, 0) where id = old.user_id;
  end if;
  return coalesce(new, old);
end $$;
