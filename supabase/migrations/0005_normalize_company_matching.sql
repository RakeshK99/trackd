-- Corporate-suffix variants of the same company (e.g. "Meta" vs "Meta
-- Platforms Inc") can score well under match_application's 0.45 trigram
-- similarity threshold — measured "Meta" vs "Meta Platforms Inc" at 0.26 —
-- which risks the new email-driven auto-create feature creating a
-- duplicate application instead of matching the existing one. Strip common
-- suffixes before comparing so short legal-name variants still match.
create or replace function public.normalize_company_name(name text)
returns text language sql immutable as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(name, '')), '[.,]', '', 'g'),
        '\s+(inc|llc|corp|corporation|co|ltd|limited|plc|group|holdings|company)\.?\s*$', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- p_threshold defaults to the original 0.45 (backward compatible for
-- existing callers); process-email also calls this with a lower threshold
-- as a conservative "is this possibly a near-duplicate?" guard before
-- auto-creating a new application from an unmatched email.
create or replace function public.match_application(p_user_id uuid, p_company text, p_threshold real default 0.45)
returns table (id uuid, company text, status app_status, sim real)
language sql stable as $$
  select id, company, status,
    similarity(normalize_company_name(company), normalize_company_name(p_company))::real as sim
  from public.applications
  where user_id = p_user_id
    and archived = false
    and similarity(normalize_company_name(company), normalize_company_name(p_company)) > p_threshold
  order by sim desc
  limit 1;
$$;
