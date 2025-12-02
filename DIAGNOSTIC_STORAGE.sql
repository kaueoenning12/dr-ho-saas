-- ==========================================
-- Diagnostic Queries for Storage Issues
-- Execute these queries in Supabase SQL Editor to diagnose the problem
-- ==========================================

-- 1. Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'documents';

-- 2. Check all storage policies for documents bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY policyname;

-- 3. Check current user's roles
SELECT 
  ur.role,
  ur.user_id,
  ur.created_at,
  p.email,
  p.name
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = auth.uid();

-- 4. Check if current user has admin or moderator role
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'moderator')
    ) THEN 'YES'
    ELSE 'NO'
  END as has_admin_or_moderator_role;

-- 5. Test the has_role function
SELECT 
  public.has_role(auth.uid(), 'admin') as is_admin,
  public.has_role(auth.uid(), 'moderator') as is_moderator,
  public.has_role(auth.uid(), 'user') as is_user;

-- 6. Check all policies on storage.objects
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 7. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 8. List all files in documents bucket (if you have access)
-- SELECT * FROM storage.objects WHERE bucket_id = 'documents' LIMIT 10;



