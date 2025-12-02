-- ==========================================
-- VERIFICAÇÃO COMPLETA DO STATUS DO STORAGE
-- Execute este SQL para diagnosticar problemas
-- ==========================================

-- 1. Verificar se o bucket existe
SELECT 
    'Bucket Status' as check_type,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
WHERE id = 'documents';

-- 2. Verificar status do RLS (Row Level Security)
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO (pode bloquear uploads)'
        ELSE 'RLS DESABILITADO (mais permissivo)'
    END as status_description
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 3. Verificar TODAS as políticas existentes
SELECT 
    'Storage Policies' as check_type,
    policyname,
    cmd as command_type,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 4. Verificar usuário atual e roles
SELECT 
    'Current User' as check_type,
    auth.uid() as user_id,
    auth.email() as user_email,
    auth.role() as auth_role;

-- 5. Verificar roles do usuário na tabela user_roles
SELECT 
    'User Roles' as check_type,
    ur.user_id,
    ur.role,
    p.email,
    p.name
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = auth.uid();

-- 6. Verificar se há objetos no bucket (para testar SELECT)
SELECT 
    'Objects in Bucket' as check_type,
    COUNT(*) as total_objects,
    SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects
WHERE bucket_id = 'documents';

-- 7. Verificar permissões do usuário atual no bucket
SELECT 
    'User Permissions Test' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'documents' 
            LIMIT 1
        ) THEN 'Pode ler objetos'
        ELSE 'NÃO pode ler objetos'
    END as can_read,
    CASE 
        WHEN auth.role() = 'authenticated' THEN 'Usuário autenticado'
        WHEN auth.role() = 'anon' THEN 'Usuário anônimo'
        ELSE 'Role desconhecida: ' || auth.role()
    END as authentication_status;

-- ==========================================
-- RESUMO: O que procurar
-- ==========================================
-- 1. Bucket deve existir com id = 'documents'
-- 2. RLS deve estar DESABILITADO (rls_enabled = false) para teste
-- 3. Deve haver políticas que permitem INSERT para authenticated
-- 4. Usuário deve ter auth.role() = 'authenticated'
-- 5. Se tudo estiver OK mas ainda der erro, o problema pode ser:
--    - Token não está sendo enviado corretamente
--    - Problema de CORS
--    - Problema na configuração do cliente Supabase



