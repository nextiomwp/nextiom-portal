-- Ensure the agreements table exists.
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_signature', 'signed', 'completed')),
    file_path TEXT NOT NULL, -- path to the unsigned agreement template in storage
    signed_file_path TEXT, -- path to the signed agreement uploaded by customer
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on agreements
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can do everything on agreements" ON agreements;
DROP POLICY IF EXISTS "Customers can view their own agreements" ON agreements;
DROP POLICY IF EXISTS "Customers can update their own agreements" ON agreements;

-- Allow admins to do everything
CREATE POLICY "Admins can do everything on agreements" ON agreements
    FOR ALL
    TO authenticated
    USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))
    WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));

-- Allow customers to view their own agreements
CREATE POLICY "Customers can view their own agreements" ON agreements
    FOR SELECT
    TO authenticated
    USING (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Allow customers to update their own agreements (specifically to upload the signed file and change status to 'signed')
CREATE POLICY "Customers can update their own agreements" ON agreements
    FOR UPDATE
    TO authenticated
    USING (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()))
    WITH CHECK (customer_id = (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Now ensure the storage bucket 'agreements' exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreements',
  'agreements',
  true,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/gif','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Remove existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated agreements reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated agreements uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated agreements update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated agreements delete" ON storage.objects;

-- Storage policies for 'agreements' bucket:
-- 1. Anyone authenticated can read
CREATE POLICY "Allow authenticated agreements reads" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'agreements');

-- 2. Anyone authenticated can upload
CREATE POLICY "Allow authenticated agreements uploads" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agreements');

-- 3. Users can update their own uploads (or admin can update)
CREATE POLICY "Allow authenticated agreements update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agreements')
  WITH CHECK (bucket_id = 'agreements');

-- 4. Admins and users can delete their own uploads
CREATE POLICY "Allow authenticated agreements delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'agreements');
