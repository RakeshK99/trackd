-- Schedule the ghost-detector Edge Function to run daily via pg_cron + pg_net.
-- The bearer secret is stored in Supabase Vault — set separately via
-- `supabase db query --linked` (never committed here in plaintext) as:
--   select vault.create_secret('<value>', 'ghost_detector_secret', 'Bearer token for ghost-detector cron');
-- This migration only references it by name.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'ghost-detector-daily',
    '0 9 * * *', -- 09:00 UTC daily
    $$
    select net.http_post(
      url := 'https://atzcinurvjhndmdpgdtv.supabase.co/functions/v1/ghost-detector',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'ghost_detector_secret'
        )
      ),
      body := '{}'::jsonb
    );
    $$
  );
