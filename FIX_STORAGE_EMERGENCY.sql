-- ==========================================
-- SOLUÇÃO DE EMERGÊNCIA - DESABILITA RLS COMPLETAMENTE
-- Execute este SQL APENAS se nada mais funcionar
-- ⚠️ ATENÇÃO: Isso remove TODAS as restrições de segurança!
-- ==========================================

-- 1. Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760, NULL)
ON CONFLICT (id) DO UPDATE 
SET name = 'documents', 
    public = false,
    file_size_limit = 10485760;

-- 2. Remover TODAS as políticas
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- 3. DESABILITAR RLS COMPLETAMENTE (TEMPORÁRIO!)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 4. Verificar se foi desabilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Se rls_enabled for 'false', o RLS está desabilitado e o upload deve funcionar
-- Após testar e confirmar que funciona, você pode reabilitar o RLS com:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- E então criar políticas apropriadas



