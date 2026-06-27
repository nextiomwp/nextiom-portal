-- Migration: Recycle Bin for Invoices
-- Adds soft delete support, configurable retention time, and pg_cron scheduler for cleanup.

-- 1. Add deleted_at column to invoices if not exists
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add recycle_bin_retention_hours column to invoice_settings if not exists
ALTER TABLE public.invoice_settings ADD COLUMN IF NOT EXISTS recycle_bin_retention_hours INTEGER DEFAULT 24;

-- 3. Create database function to purge expired invoices
CREATE OR REPLACE FUNCTION public.purge_expired_invoices()
RETURNS VOID AS $$
BEGIN
  -- Delete invoices where deleted_at is older than the user's settings recycle_bin_retention_hours (defaults to 24)
  DELETE FROM public.invoices i
  USING public.invoice_settings s
  WHERE i.deleted_at IS NOT NULL
    AND i.user_id = s.user_id
    AND i.deleted_at < (NOW() - (COALESCE(s.recycle_bin_retention_hours, 24) * INTERVAL '1 hour'));

  -- Also delete any deleted invoices where there is no user settings record, using 24h as fallback
  DELETE FROM public.invoices
  WHERE deleted_at IS NOT NULL
    AND deleted_at < (NOW() - INTERVAL '24 hours')
    AND user_id NOT IN (SELECT user_id FROM public.invoice_settings);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable pg_cron and schedule the purge function to run every hour
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Safely unschedule existing job if it exists
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-expired-invoices-job';

SELECT cron.schedule(
  'purge-expired-invoices-job',
  '0 * * * *', -- runs at the start of every hour
  'SELECT public.purge_expired_invoices();'
);
