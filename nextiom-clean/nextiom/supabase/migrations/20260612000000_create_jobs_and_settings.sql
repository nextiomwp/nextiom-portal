-- Migration to create jobs and job_settings tables

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    service_package TEXT,
    priority TEXT NOT NULL,
    estimated_start TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    queue_position INTEGER,
    status TEXT NOT NULL,
    assign_to TEXT,
    description TEXT,
    send_email_notification BOOLEAN DEFAULT false,
    customer_requirements JSONB DEFAULT '[]'::jsonb,
    internal_notes TEXT DEFAULT '',
    customer_view_notes TEXT DEFAULT '',
    progress_step INTEGER DEFAULT 0,
    timeline_steps JSONB DEFAULT '["Request Submitted", "Under Review", "Waiting for Customer", "Job Created", "Design Phase", "Development", "Testing", "Client Review", "Completed"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    show_custom_active_jobs BOOLEAN DEFAULT false,
    custom_active_jobs_count INTEGER DEFAULT 15,
    max_concurrent_jobs INTEGER DEFAULT 10,
    display_queue_to_customers BOOLEAN DEFAULT true,
    display_active_job_count BOOLEAN DEFAULT true,
    display_queue_position BOOLEAN DEFAULT true,
    auto_sort_jobs_in_queue BOOLEAN DEFAULT true,
    queue_position_mode TEXT DEFAULT 'automatic', -- 'automatic' or 'manual'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Insert default settings row if not exists
INSERT INTO public.job_settings (
    id, 
    show_custom_active_jobs, 
    custom_active_jobs_count, 
    max_concurrent_jobs, 
    display_queue_to_customers, 
    display_active_job_count, 
    display_queue_position, 
    auto_sort_jobs_in_queue, 
    queue_position_mode
)
VALUES (1, false, 15, 10, true, true, true, true, 'automatic')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "admin all jobs" ON public.jobs;
DROP POLICY IF EXISTS "customer own jobs" ON public.jobs;
DROP POLICY IF EXISTS "customer update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "admin all job_settings" ON public.job_settings;
DROP POLICY IF EXISTS "read job_settings" ON public.job_settings;

-- Create policies for jobs
CREATE POLICY "admin all jobs" ON public.jobs
    FOR ALL
    TO authenticated
    USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
    WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));

CREATE POLICY "customer own jobs" ON public.jobs
    FOR SELECT
    TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "customer update own jobs" ON public.jobs
    FOR UPDATE
    TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
    WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Create policies for job_settings
CREATE POLICY "admin all job_settings" ON public.job_settings
    FOR ALL
    TO authenticated
    USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
    WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));

CREATE POLICY "read job_settings" ON public.job_settings
    FOR SELECT
    TO authenticated
    USING (true);
