-- ==========================================
-- TEMPORARY: Very Permissive Policy for Testing
-- This allows ANY authenticated user to upload
-- Use this ONLY for testing to isolate the problem
-- ==========================================

-- 1. Ensure the documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop ALL existing policies for documents bucket
DROP POLICY IF EXISTS "Admins and moderators can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and moderators can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

-- 3. Create VERY PERMISSIVE policies for testing
-- INSERT: Allow ANY authenticated user
CREATE POLICY "TEMP: Any authenticated user can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- UPDATE: Allow ANY authenticated user (temporary)
CREATE POLICY "TEMP: Any authenticated user can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- SELECT: Allow ANY authenticated user
CREATE POLICY "TEMP: Any authenticated user can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- DELETE: Allow ANY authenticated user (temporary - be careful!)
CREATE POLICY "TEMP: Any authenticated user can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- ==========================================
-- IMPORTANT: After testing, restore proper policies!
-- Use FIX_STORAGE_PERMISSIONS.sql or FIX_STORAGE_PERMISSIONS_ALTERNATIVE.sql
-- ==========================================



