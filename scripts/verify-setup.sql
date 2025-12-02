-- Script de Verificação de Setup
-- Execute este script no Supabase SQL Editor para verificar se tudo está configurado corretamente

-- 1. Verificar se a RPC function existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'update_user_subscription_plan'
    ) THEN '✅ RPC function existe'
    ELSE '❌ RPC function NÃO existe - Execute a migration 20250125000000_add_update_subscription_plan_rpc.sql'
  END AS rpc_function_status;

-- 2. Verificar se a RLS policy "Users can update their own subscription" existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_subscriptions' 
      AND policyname = 'Users can update their own subscription'
    ) THEN '✅ RLS policy "Users can update their own subscription" existe'
    ELSE '❌ RLS policy NÃO existe - Execute a migration 20250125000000_add_update_subscription_plan_rpc.sql'
  END AS rls_policy_status;

-- 3. Verificar permissões da RPC function
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_proc_acl a ON p.oid = a.prooid
      WHERE n.nspname = 'public' 
      AND p.proname = 'update_user_subscription_plan'
      AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    ) THEN '✅ Permissão GRANT para authenticated existe'
    ELSE '⚠️ Verifique se a permissão GRANT foi aplicada'
  END AS grant_permission_status;

-- 4. Verificar todas as RLS policies na tabela user_subscriptions
SELECT 
  policyname AS policy_name,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_subscriptions'
ORDER BY policyname;

-- 5. Verificar se a tabela user_subscriptions tem a coluna plan_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_subscriptions' 
      AND column_name = 'plan_id'
    ) THEN '✅ Coluna plan_id existe'
    ELSE '❌ Coluna plan_id NÃO existe'
  END AS plan_id_column_status;

-- 6. Verificar se o plano premium existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM subscription_plans 
      WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c' 
      AND is_active = true
    ) THEN '✅ Plano premium existe e está ativo'
    ELSE '❌ Plano premium NÃO existe ou está inativo'
  END AS premium_plan_status;

-- 7. Verificar detalhes da RPC function (se existir)
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'update_user_subscription_plan';

-- 8. Verificar se RLS está habilitado na tabela
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public' 
      AND t.tablename = 'user_subscriptions'
      AND c.relrowsecurity = true
    ) THEN '✅ RLS está habilitado'
    ELSE '❌ RLS NÃO está habilitado'
  END AS rls_enabled_status;

