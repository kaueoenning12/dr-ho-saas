-- Script de Validação: Verificar Configuração Stripe para Produção
-- Execute este script ANTES de ativar a configuração de produção
-- Ele verifica se tudo está configurado corretamente

-- ============================================
-- 1. VERIFICAR CONFIGURAÇÃO DO STRIPE
-- ============================================
SELECT 
  '=== CONFIGURAÇÃO STRIPE ===' as secao,
  id,
  environment,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN '⚠️ TESTE'
    ELSE '❌ INVÁLIDO'
  END as tipo_chave,
  is_active,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  CASE 
    WHEN webhook_secret IS NOT NULL THEN '✅ Configurado'
    ELSE '⚠️ Não configurado'
  END as webhook_status,
  default_product_id,
  default_price_id
FROM stripe_config
ORDER BY is_active DESC, environment;

-- ============================================
-- 2. VERIFICAR PLANOS
-- ============================================
SELECT 
  '=== PLANOS ===' as secao,
  id,
  name,
  price,
  stripe_product_id,
  stripe_price_id,
  CASE 
    WHEN stripe_price_id IS NULL THEN '❌ NÃO CONFIGURADO'
    WHEN LENGTH(stripe_price_id) < 30 THEN '⚠️ PODE SER TESTE'
    ELSE '✅ PODE SER PRODUÇÃO'
  END as tipo_price_id,
  is_active
FROM subscription_plans
WHERE is_active = true;

-- ============================================
-- 3. VERIFICAR COMPATIBILIDADE
-- ============================================
SELECT 
  '=== COMPATIBILIDADE ===' as secao,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  sp.name as plano_nome,
  sp.stripe_price_id,
  CASE 
    WHEN sp.stripe_price_id IS NULL THEN '❌ PRICE ID NÃO CONFIGURADO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN '✅ COMPATÍVEL'
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 THEN '✅ COMPATÍVEL'
    ELSE '❌ INCOMPATÍVEL - Verifique manualmente no Stripe Dashboard'
  END as status_compatibilidade,
  CASE 
    WHEN sc.is_active = true AND sc.secret_key LIKE 'sk_live_%' THEN '✅ PRONTO PARA PRODUÇÃO'
    WHEN sc.is_active = true AND sc.secret_key LIKE 'sk_test_%' THEN '⚠️ AINDA EM TESTE'
    ELSE '❌ CONFIGURAÇÃO NÃO ATIVA'
  END as status_geral
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true 
  AND sp.is_active = true;

-- ============================================
-- 4. VERIFICAR CONFIGURAÇÕES ATIVAS
-- ============================================
SELECT 
  '=== RESUMO ===' as secao,
  COUNT(*) FILTER (WHERE is_active = true AND environment = 'live') as configs_live_ativas,
  COUNT(*) FILTER (WHERE is_active = true AND environment = 'test') as configs_test_ativas,
  COUNT(*) FILTER (WHERE is_active = true) as total_configs_ativas,
  CASE 
    WHEN COUNT(*) FILTER (WHERE is_active = true) = 0 THEN '❌ NENHUMA CONFIGURAÇÃO ATIVA'
    WHEN COUNT(*) FILTER (WHERE is_active = true) > 1 THEN '❌ MÚLTIPLAS CONFIGURAÇÕES ATIVAS'
    WHEN COUNT(*) FILTER (WHERE is_active = true AND environment = 'live') = 1 THEN '✅ CONFIGURAÇÃO DE PRODUÇÃO ATIVA'
    ELSE '⚠️ CONFIGURAÇÃO DE TESTE ATIVA'
  END as status_final
FROM stripe_config;

-- ============================================
-- 5. CHECKLIST DE VALIDAÇÃO
-- ============================================
SELECT 
  '=== CHECKLIST ===' as secao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stripe_config 
      WHERE is_active = true 
      AND secret_key LIKE 'sk_live_%'
      AND publishable_key LIKE 'pk_live_%'
    ) THEN '✅ Chaves de produção configuradas'
    ELSE '❌ Chaves de produção NÃO configuradas'
  END as item_1,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stripe_config 
      WHERE is_active = true 
      AND webhook_secret IS NOT NULL
      AND webhook_secret LIKE 'whsec_%'
    ) THEN '✅ Webhook secret configurado'
    ELSE '⚠️ Webhook secret NÃO configurado (opcional mas recomendado)'
  END as item_2,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM subscription_plans sp
      CROSS JOIN stripe_config sc
      WHERE sp.is_active = true
      AND sc.is_active = true
      AND sp.stripe_price_id IS NOT NULL
      AND sp.stripe_price_id LIKE 'price_%'
    ) THEN '✅ Price IDs configurados nos planos'
    ELSE '❌ Price IDs NÃO configurados nos planos'
  END as item_3,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM stripe_config WHERE is_active = true
    ) = 1 THEN '✅ Apenas uma configuração ativa'
    ELSE '❌ Múltiplas ou nenhuma configuração ativa'
  END as item_4;



