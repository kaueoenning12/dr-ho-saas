-- ==========================================
-- Alternative: Allow All Authenticated Users to Upload
-- Use this if the role-based policy doesn't work
-- Execute this SQL in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure the documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Admins and moderators can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;

-- 3. Allow ALL authenticated users to upload documents
-- This is more permissive but ensures uploads work
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- 4. Keep update policy for admins and moderators
DROP POLICY IF EXISTS "Admins and moderators can update documents" ON storage.objects;
CREATE POLICY "Admins and moderators can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND 
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'moderator')
    )
  );

-- 5. Keep select policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- 6. Keep delete policy for admins only
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND 
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );



