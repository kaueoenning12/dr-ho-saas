-- ==========================================
-- Fix Storage Permissions for Documents Bucket
-- Execute this SQL in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure the documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Admins and moderators can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;

-- 3. Create a more robust policy for admins and moderators
-- This policy checks roles directly from user_roles table
CREATE POLICY "Admins and moderators can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND 
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'moderator')
      )
    )
  );

-- 4. Alternative: Allow all authenticated users to upload (uncomment if needed)
-- CREATE POLICY "Authenticated users can upload documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'documents' AND 
--     auth.role() = 'authenticated'
--   );

-- 5. Ensure update policy exists for admins and moderators
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

-- 6. Ensure select policy exists for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- 7. Ensure delete policy exists for admins only
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

-- ==========================================
-- Verification Query (run this to check your role)
-- ==========================================
-- SELECT 
--   ur.role,
--   ur.user_id,
--   auth.uid() as current_user_id
-- FROM public.user_roles ur
-- WHERE ur.user_id = auth.uid();



