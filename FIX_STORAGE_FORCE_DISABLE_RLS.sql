-- ==========================================
-- SQL FORÇADO - DESABILITA RLS DEFINITIVAMENTE
-- Execute este SQL no Supabase SQL Editor
-- Este script FORÇA a desabilitação do RLS
-- ==========================================

-- PASSO 1: Verificar status ANTES
DO $$
BEGIN
  RAISE NOTICE '=== STATUS ANTES DA EXECUÇÃO ===';
END $$;

SELECT 
    'ANTES' as momento,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS HABILITADO (bloqueando uploads)'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- PASSO 2: Garantir que o bucket existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('documents', 'documents', false, 10485760, NULL);
    RAISE NOTICE '✅ Bucket "documents" criado';
  ELSE
    UPDATE storage.buckets 
    SET name = 'documents', 
        public = false,
        file_size_limit = 10485760
    WHERE id = 'documents';
    RAISE NOTICE '✅ Bucket "documents" atualizado';
  END IF;
END $$;

-- PASSO 3: Remover TODAS as políticas (sem exceção)
DO $$ 
DECLARE 
    r RECORD;
    policy_count INTEGER := 0;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
        policy_count := policy_count + 1;
    END LOOP;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Removidas % políticas', policy_count;
    ELSE
        RAISE NOTICE 'ℹ️ Nenhuma política encontrada para remover';
    END IF;
END $$;

-- PASSO 4: FORÇAR desabilitação do RLS
DO $$
BEGIN
  -- Tentar desabilitar RLS
  ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLS DESABILITADO FORÇADAMENTE';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erro ao desabilitar RLS: %', SQLERRM;
    -- Tentar novamente com FORCE (se suportado)
    BEGIN
      ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY FORCE;
      RAISE NOTICE '✅ RLS DESABILITADO COM FORCE';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Não foi possível desabilitar RLS: %', SQLERRM;
    END;
END $$;

-- PASSO 5: Verificar status DEPOIS
DO $$
BEGIN
  RAISE NOTICE '=== STATUS DEPOIS DA EXECUÇÃO ===';
END $$;

SELECT 
    'DEPOIS' as momento,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AINDA HABILITADO (problema!)'
        ELSE '✅ RLS DESABILITADO (sucesso!)'
    END as status
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- PASSO 6: Verificar bucket
SELECT 
    'Bucket Status' as check_type,
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets
WHERE id = 'documents';

-- PASSO 7: Verificar políticas restantes
SELECT 
    'Políticas Restantes' as check_type,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- ==========================================
-- RESULTADO ESPERADO:
-- - rls_enabled deve ser 'false' (RLS desabilitado)
-- - total_policies deve ser 0 (nenhuma política)
-- - Bucket 'documents' deve existir
-- ==========================================



