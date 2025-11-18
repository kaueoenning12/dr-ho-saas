-- ==========================================
-- FASE 1: Políticas RLS para Storage Bucket 'documents'
-- ==========================================

-- Política 1: Permitir INSERT para admins e moderadores
CREATE POLICY "Admins and moderators can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('admin', 'moderator')
  ))
);

-- Política 2: Permitir SELECT para usuários autenticados
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Política 3: Permitir UPDATE para admins
CREATE POLICY "Admins can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

-- Política 4: Permitir DELETE para admins
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);

-- ==========================================
-- FASE 2: Corrigir Recursão Infinita em document_folders
-- ==========================================

-- Função security definer para verificar se pasta tem filhas (sem recursão)
CREATE OR REPLACE FUNCTION public.folder_has_children(folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.document_folders
    WHERE parent_folder_id = folder_id
  )
$$;

-- Dropar política antiga que causa recursão
DROP POLICY IF EXISTS "Published documents' folders are viewable by everyone" 
ON public.document_folders;

-- Criar nova política sem recursão usando função security definer
CREATE POLICY "Published documents folders are viewable"
ON public.document_folders FOR SELECT
TO public
USING (
  -- Pastas com documentos publicados
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.parent_folder_id = document_folders.id
      AND documents.is_published = true
  )
  OR
  -- OU pastas que tem subpastas (usa função security definer)
  public.folder_has_children(document_folders.id)
);