-- Migration: Add Welcome Modal Shown
-- Adds welcome_modal_shown column to customers table and updates admin_customers_view

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS welcome_modal_shown BOOLEAN DEFAULT false;

-- Drop view first to avoid column naming/ordering conflicts when altering columns
DROP VIEW IF EXISTS public.admin_customers_view;

-- Recreate view to include the new column
CREATE OR REPLACE VIEW public.admin_customers_view AS
SELECT 
  c.id,
  c.user_id,
  c.name,
  c.email,
  c.phone,
  c.company,
  c.country,
  c.status,
  c.created_at,
  c.updated_at,
  c.notifications_cleared_at,
  c.activities_cleared_at,
  c.email_otp_verified,
  c.phone_otp_verified,
  c.welcome_modal_shown,
  u.last_sign_in_at AS last_activity
FROM public.customers c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  AND (u.raw_app_meta_data ->> 'role'::text IS DISTINCT FROM 'admin');

GRANT SELECT ON public.admin_customers_view TO authenticated;
GRANT SELECT ON public.admin_customers_view TO anon;
