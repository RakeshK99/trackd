-- Trackd initial schema
-- Aligns with Trackd_Full_Architecture.docx §2 (schema) and §3 (algorithms).

create extension if not exists pg_trgm;

-- =====================================================================
-- Enums
-- =====================================================================
do $$ begin
  create type app_status as enum (
    'saved','applied','phone_screen','interview',
    'offer','rejected','ghosted','withdrawn'
  );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- users: mirror row of auth.users with Trackd-specific fields
-- =====================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  agentmail_inbox_id text,
  agentmail_pod_id text,
  trackd_email text,
  plan text not null default 'free' check (plan in ('free','pro')),
  active_app_count int not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- applications
-- =====================================================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company text not null,
  role text not null,
  status app_status not null default 'saved',
  salary_range text,
  job_url text,
  notes text,
  last_activity timestamptz not null default now(),
  applied_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_apps_user_archived_status
  on public.applications (user_id, archived, status);
create index if not exists idx_apps_user_last_activity
  on public.applications (user_id, last_activity desc);
create index if not exists idx_apps_company_trgm
  on public.applications using gin (lower(company) gin_trgm_ops);

-- =====================================================================
-- timeline_events (append-only)
-- =====================================================================
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'status_change','email_received','note_added','manual_edit','ghost_flagged','created'
  )),
  old_status app_status,
  new_status app_status,
  email_subject text,
  email_from text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_timeline_app_created
  on public.timeline_events (application_id, created_at desc);

-- =====================================================================
-- email_events (raw inbound, dedup + audit)
-- =====================================================================
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  agentmail_message_id text unique not null,
  user_id uuid not null references public.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  from_address text,
  subject text,
  body_preview text,
  classified_status app_status,
  classified_company text,
  confidence numeric(4,3),
  processed_at timestamptz not null default now()
);

-- =====================================================================
-- push_tokens (Expo)
-- =====================================================================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Free tier enforcement + active_app_count maintenance
-- =====================================================================
create or replace function public.enforce_active_app_limit()
returns trigger language plpgsql as $$
declare
  v_plan text;
  v_count int;
begin
  select plan, active_app_count into v_plan, v_count
  from public.users where id = new.user_id for update;

  if tg_op = 'INSERT' and new.archived = false then
    if v_plan = 'free' and v_count >= 15 then
      raise exception 'FREE_TIER_LIMIT' using errcode = 'P0001';
    end if;
    update public.users set active_app_count = active_app_count + 1 where id = new.user_id;
  elsif tg_op = 'UPDATE' then
    if old.archived = false and new.archived = true then
      update public.users set active_app_count = greatest(active_app_count - 1, 0) where id = new.user_id;
    elsif old.archived = true and new.archived = false then
      if v_plan = 'free' and v_count >= 15 then
        raise exception 'FREE_TIER_LIMIT' using errcode = 'P0001';
      end if;
      update public.users set active_app_count = active_app_count + 1 where id = new.user_id;
    end if;
  elsif tg_op = 'DELETE' and old.archived = false then
    update public.users set active_app_count = greatest(active_app_count - 1, 0) where id = old.user_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_active_app_limit_ins on public.applications;
create trigger trg_active_app_limit_ins
  before insert on public.applications
  for each row execute function public.enforce_active_app_limit();

drop trigger if exists trg_active_app_limit_upd on public.applications;
create trigger trg_active_app_limit_upd
  before update of archived on public.applications
  for each row execute function public.enforce_active_app_limit();

drop trigger if exists trg_active_app_limit_del on public.applications;
create trigger trg_active_app_limit_del
  after delete on public.applications
  for each row execute function public.enforce_active_app_limit();

-- =====================================================================
-- Auto-log status_change to timeline
-- =====================================================================
create or replace function public.log_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into public.timeline_events (application_id, user_id, event_type, old_status, new_status)
    values (new.id, new.user_id, 'status_change', old.status, new.status);
  end if;
  if new.status is distinct from old.status or new.notes is distinct from old.notes then
    new.last_activity := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_log_status_change on public.applications;
create trigger trg_log_status_change
  before update on public.applications
  for each row execute function public.log_status_change();

-- =====================================================================
-- match_application RPC (pg_trgm fuzzy company match)
-- =====================================================================
create or replace function public.match_application(p_user_id uuid, p_company text)
returns table (id uuid, company text, status app_status, sim real)
language sql stable as $$
  select id, company, status, similarity(lower(company), lower(p_company))::real as sim
  from public.applications
  where user_id = p_user_id
    and archived = false
    and similarity(lower(company), lower(p_company)) > 0.45
  order by sim desc
  limit 1;
$$;

-- =====================================================================
-- Auto-create users row on auth.users insert
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.users enable row level security;
alter table public.applications enable row level security;
alter table public.timeline_events enable row level security;
alter table public.email_events enable row level security;
alter table public.push_tokens enable row level security;

-- users: read/update own row
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select using (auth.uid() = id);
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update using (auth.uid() = id);

-- applications: full CRUD on own rows
drop policy if exists apps_owner_all on public.applications;
create policy apps_owner_all on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- timeline_events: read own, insert own (writes also happen via service role)
drop policy if exists timeline_owner_read on public.timeline_events;
create policy timeline_owner_read on public.timeline_events
  for select using (auth.uid() = user_id);
drop policy if exists timeline_owner_insert on public.timeline_events;
create policy timeline_owner_insert on public.timeline_events
  for insert with check (auth.uid() = user_id);

-- email_events: read-only for owner
drop policy if exists email_owner_read on public.email_events;
create policy email_owner_read on public.email_events
  for select using (auth.uid() = user_id);

-- push_tokens: owner can manage
drop policy if exists push_owner_all on public.push_tokens;
create policy push_owner_all on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
