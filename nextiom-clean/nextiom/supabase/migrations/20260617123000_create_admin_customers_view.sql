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
  u.last_sign_in_at AS last_activity
FROM public.customers c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  AND (u.raw_app_meta_data ->> 'role'::text IS DISTINCT FROM 'admin');

GRANT SELECT ON public.admin_customers_view TO authenticated;
GRANT SELECT ON public.admin_customers_view TO anon;
