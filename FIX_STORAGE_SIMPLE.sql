-- ==========================================
-- SOLUÇÃO SIMPLES E GARANTIDA
-- Execute este SQL no Supabase SQL Editor
-- ==========================================

-- Passo 1: Garantir que o bucket existe
-- Primeiro, verificar se já existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('documents', 'documents', false, 10485760, NULL);
    RAISE NOTICE 'Bucket "documents" criado com sucesso';
  ELSE
    RAISE NOTICE 'Bucket "documents" já existe';
    -- Atualizar configurações do bucket existente
    UPDATE storage.buckets 
    SET name = 'documents', 
        public = false,
        file_size_limit = 10485760
    WHERE id = 'documents';
  END IF;
END $$;

-- Passo 2: Remover TODAS as políticas existentes relacionadas a documents
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND (policyname LIKE '%documents%' OR policyname LIKE '%document%'))
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Passo 3: Criar políticas simples e diretas
-- INSERT: Qualquer usuário autenticado pode fazer upload
CREATE POLICY "Allow authenticated uploads to documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- SELECT: Qualquer usuário autenticado pode ver
CREATE POLICY "Allow authenticated reads from documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- UPDATE: Qualquer usuário autenticado pode atualizar
CREATE POLICY "Allow authenticated updates to documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- DELETE: Qualquer usuário autenticado pode deletar (temporário para teste)
CREATE POLICY "Allow authenticated deletes from documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- ==========================================
-- Verificação: Execute esta query para confirmar
-- ==========================================
-- SELECT policyname, cmd FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects' 
-- AND policyname LIKE '%documents%';



