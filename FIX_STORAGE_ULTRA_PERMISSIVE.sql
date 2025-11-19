-- ==========================================
-- SOLUÇÃO ULTRA PERMISSIVA - APENAS PARA TESTE
-- Execute este SQL se o FIX_STORAGE_SIMPLE.sql não funcionou
-- ==========================================

-- Passo 1: Garantir que o bucket existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('documents', 'documents', false, 10485760, NULL);
    RAISE NOTICE 'Bucket "documents" criado com sucesso';
  ELSE
    RAISE NOTICE 'Bucket "documents" já existe';
  END IF;
END $$;

-- Passo 2: Remover TODAS as políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
    RAISE NOTICE 'Todas as políticas removidas';
END $$;

-- Passo 3: DESABILITAR RLS TEMPORARIAMENTE (APENAS PARA TESTE!)
-- ATENÇÃO: Isso remove todas as restrições de segurança
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Passo 4: Criar política única que permite TUDO para usuários autenticados
-- (Mesmo com RLS desabilitado, vamos criar a política para quando reabilitar)
CREATE POLICY "Allow all for authenticated users"
  ON storage.objects
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- IMPORTANTE: Após testar e confirmar que funciona,
-- reabilite o RLS com:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- ==========================================

-- ==========================================
-- Verificação: Execute estas queries para confirmar
-- ==========================================
-- Verificar se RLS está desabilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects';

-- Verificar políticas:
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- Verificar bucket:
-- SELECT * FROM storage.buckets WHERE id = 'documents';



