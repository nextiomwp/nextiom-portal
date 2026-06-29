-- Migration: Schedule Renewal SMS Reminders
-- Creates a secure function to invoke the renewal-sms-reminders Edge Function and registers a daily cron job.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the database function to trigger the Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.cron_trigger_renewal_sms_reminders()
RETURNS VOID AS $$
DECLARE
  url_val TEXT;
  key_val TEXT;
BEGIN
  -- Retrieve the decrypted secrets from the vault
  SELECT decrypted_secret INTO url_val FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO key_val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- Gracefully skip execution if secrets are not configured (e.g. in local development environments)
  IF url_val IS NULL OR key_val IS NULL THEN
    RAISE WARNING 'project_url or service_role_key not found in vault. Skipping renewal SMS reminders trigger.';
    RETURN;
  END IF;

  -- Trigger the Edge Function asynchronously
  PERFORM net.http_post(
    url := url_val || '/functions/v1/renewal-sms-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key_val
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely unschedule existing job if it exists to avoid duplicate registrations
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'trigger-renewal-reminders-job';

-- Schedule the job to run every day at 03:00 AM UTC
SELECT cron.schedule(
  'trigger-renewal-reminders-job',
  '0 3 * * *',
  'SELECT public.cron_trigger_renewal_sms_reminders();'
);
