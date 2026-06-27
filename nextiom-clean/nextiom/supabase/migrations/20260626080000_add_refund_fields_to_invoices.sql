-- Nextiom — Add invoice refund fields and status check constraints
-- Run in Supabase Dashboard → SQL Editor

BEGIN;

-- 1. Add refund columns to invoices table if they do not exist
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refund_date TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refund_service_charge NUMERIC(12,2) DEFAULT 0.00;

-- 2. Add refunded column to invoice_items table if it does not exist
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE;

-- 3. Update status constraint on invoices table to include refunded and partially_refunded
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('unpaid', 'paid', 'overdue', 'payment_submitted', 'partially_paid', 'refunded', 'partially_refunded'));

COMMIT;
