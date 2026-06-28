-- Schedule the send-reminders edge function to run once a day via pg_cron.
--
-- The job's URL and service-role key are read from Vault at run time, so they
-- stay out of source control and can differ per environment. Set them once per
-- project (e.g. in the SQL editor) before the job will do anything:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--
-- Until those secrets exist the job is harmless — the POST simply has no target.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 09:00 UTC daily. A single server-side run fans out to every user whose
-- reminders land today; per-timezone delivery is a future refinement.
select cron.schedule(
  'datepad-send-reminders',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
