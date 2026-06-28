-- Add verification columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email_otp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_otp_code TEXT DEFAULT null,
ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ DEFAULT null;

-- Drop view first to avoid column naming/ordering conflicts when altering columns
DROP VIEW IF EXISTS public.admin_customers_view;

-- Recreate view to include the new columns
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
  u.last_sign_in_at AS last_activity
FROM public.customers c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  AND (u.raw_app_meta_data ->> 'role'::text IS DISTINCT FROM 'admin');

GRANT SELECT ON public.admin_customers_view TO authenticated;
GRANT SELECT ON public.admin_customers_view TO anon;
