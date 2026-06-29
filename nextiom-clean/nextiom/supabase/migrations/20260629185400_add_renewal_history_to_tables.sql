-- Add renewal_history column to licenses, domain_requests, and email_requests
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS renewal_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE domain_requests ADD COLUMN IF NOT EXISTS renewal_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE email_requests ADD COLUMN IF NOT EXISTS renewal_history jsonb DEFAULT '[]'::jsonb;
