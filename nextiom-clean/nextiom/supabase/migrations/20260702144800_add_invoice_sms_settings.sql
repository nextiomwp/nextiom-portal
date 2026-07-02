-- Migration: Add Invoice SMS Settings
-- Adds invoice_sms and invoice_reminder_days columns to sms_settings

ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS invoice_sms BOOLEAN DEFAULT false;
ALTER TABLE sms_settings ADD COLUMN IF NOT EXISTS invoice_reminder_days INTEGER DEFAULT 2;
