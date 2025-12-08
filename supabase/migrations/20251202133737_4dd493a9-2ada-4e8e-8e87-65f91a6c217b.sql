-- ====================================================
-- FASE 1: Corrigir Políticas RLS do Storage
-- Usar has_role() que é SECURITY DEFINER e evita recursão
-- ====================================================

-- 1. Remover políticas antigas do bucket documents (se existirem)
DROP POLICY IF EXISTS "Admins and moderators can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_admin_moderator" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_admin_moderator" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_admin" ON storage.objects;

-- 2. Garantir que o bucket documents existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- 3. Criar políticas otimizadas usando has_role() 

-- SELECT: Usuários autenticados podem ver arquivos do bucket documents
CREATE POLICY "documents_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- INSERT: Admins e moderadores podem fazer upload no bucket documents
CREATE POLICY "documents_insert_admin_moderator"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

-- UPDATE: Admins e moderadores podem atualizar arquivos no bucket documents
CREATE POLICY "documents_update_admin_moderator"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

-- DELETE: Apenas admins podem deletar arquivos no bucket documents
CREATE POLICY "documents_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  public.has_role(auth.uid(), 'admin')
);