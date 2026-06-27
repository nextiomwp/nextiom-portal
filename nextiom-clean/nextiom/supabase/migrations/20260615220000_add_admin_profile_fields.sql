-- Add required columns for customer management UI improvements

-- 1. Jobs Table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

-- 2. Tickets Table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS assigned_staff TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS last_reply_time TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS response_sla TEXT;

-- 3. Domain Requests Table (represents active and pending domains)
ALTER TABLE public.domain_requests ADD COLUMN IF NOT EXISTS registrar TEXT;
ALTER TABLE public.domain_requests ADD COLUMN IF NOT EXISTS nameservers TEXT;
ALTER TABLE public.domain_requests ADD COLUMN IF NOT EXISTS whois_privacy TEXT;

-- 4. Email Requests Table (represents active and pending email accounts)
ALTER TABLE public.email_requests ADD COLUMN IF NOT EXISTS storage_used TEXT;
ALTER TABLE public.email_requests ADD COLUMN IF NOT EXISTS password_last_changed TIMESTAMPTZ;
ALTER TABLE public.email_requests ADD COLUMN IF NOT EXISTS forwarders TEXT;

-- 5. Hosting Requests Table (represents active and pending hosting packages)
ALTER TABLE public.hosting_requests ADD COLUMN IF NOT EXISTS server_name TEXT;
ALTER TABLE public.hosting_requests ADD COLUMN IF NOT EXISTS hosting_provider TEXT;
ALTER TABLE public.hosting_requests ADD COLUMN IF NOT EXISTS disk_usage TEXT;
ALTER TABLE public.hosting_requests ADD COLUMN IF NOT EXISTS bandwidth_usage TEXT;
ALTER TABLE public.hosting_requests ADD COLUMN IF NOT EXISTS renewal_cost NUMERIC;
