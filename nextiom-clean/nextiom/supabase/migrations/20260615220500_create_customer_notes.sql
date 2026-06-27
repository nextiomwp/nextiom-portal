-- Migration to create customer_notes table

CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL, -- 'private', 'sales', 'billing', 'technical'
    note_content TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Allow admins to do everything
CREATE POLICY "admin all customer_notes" ON public.customer_notes
    FOR ALL
    TO authenticated
    USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
    WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));
