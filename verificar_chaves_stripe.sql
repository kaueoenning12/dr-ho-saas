-- Script para verificar todas as chaves API do Stripe configuradas no sistema
-- Execute este script no Supabase SQL Editor para diagnosticar problemas de configuração

-- ============================================
-- 1. VERIFICAR CONFIGURAÇÕES NA TABELA stripe_config
-- ============================================
SELECT 
  id,
  environment,
  CASE 
    WHEN secret_key LIKE 'sk_test_%' THEN '✅ TESTE'
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '❌ FORMATO INVÁLIDO'
  END as tipo_secret_key,
  CASE 
    WHEN publishable_key LIKE 'pk_test_%' THEN '✅ TESTE'
    WHEN publishable_key LIKE 'pk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '❌ FORMATO INVÁLIDO'
  END as tipo_publishable_key,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  is_active,
  created_at,
  updated_at
FROM stripe_config
ORDER BY environment, is_active DESC, created_at DESC;

-- ============================================
-- 2. VERIFICAR CONFIGURAÇÃO ATIVA (is_active = true)
-- ============================================
SELECT 
  '🔍 CONFIGURAÇÃO ATIVA' as status,
  environment,
  CASE 
    WHEN secret_key LIKE 'sk_test_%' THEN 'TESTE'
    WHEN secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    ELSE 'DESCONHECIDO'
  END as tipo_secret_key,
  CASE 
    WHEN publishable_key LIKE 'pk_test_%' THEN 'TESTE'
    WHEN publishable_key LIKE 'pk_live_%' THEN 'PRODUÇÃO'
    ELSE 'DESCONHECIDO'
  END as tipo_publishable_key,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  CASE 
    WHEN (secret_key LIKE 'sk_test_%' AND publishable_key LIKE 'pk_test_%') THEN '✅ COMPATÍVEL (ambas TESTE)'
    WHEN (secret_key LIKE 'sk_live_%' AND publishable_key LIKE 'pk_live_%') THEN '✅ COMPATÍVEL (ambas PRODUÇÃO)'
    WHEN (secret_key LIKE 'sk_test_%' AND publishable_key LIKE 'pk_live_%') THEN '❌ INCOMPATÍVEL (secret TESTE, publishable PRODUÇÃO)'
    WHEN (secret_key LIKE 'sk_live_%' AND publishable_key LIKE 'pk_test_%') THEN '❌ INCOMPATÍVEL (secret PRODUÇÃO, publishable TESTE)'
    ELSE '⚠️ VERIFICAR FORMATO'
  END as compatibilidade_chaves
FROM stripe_config
WHERE is_active = true
LIMIT 1;

-- ============================================
-- 3. VERIFICAR PLANOS E SEUS PRICE IDs
-- ============================================
SELECT 
  sp.id as plan_id,
  sp.name as plan_name,
  sp.price,
  sp.stripe_product_id,
  sp.stripe_price_id,
  CASE 
    WHEN LENGTH(sp.stripe_price_id) >= 30 THEN 'PRODUÇÃO (Price ID longo)'
    WHEN LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 'TESTE (Price ID curto)'
    ELSE 'NÃO CONFIGURADO'
  END as tipo_price_id,
  sp.is_active as plan_active
FROM subscription_plans sp
ORDER BY sp.created_at DESC;

-- ============================================
-- 4. VERIFICAR INCOMPATIBILIDADE ENTRE CHAVE E PRICE ID
-- ============================================
SELECT 
  '⚠️ DIAGNÓSTICO DE INCOMPATIBILIDADE' as diagnostico,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    ELSE 'DESCONHECIDO'
  END as tipo_chave_secreta,
  sp.name as plan_name,
  sp.stripe_price_id,
  CASE 
    WHEN LENGTH(sp.stripe_price_id) >= 30 THEN 'PRODUÇÃO'
    WHEN LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 'TESTE'
    ELSE 'NÃO CONFIGURADO'
  END as tipo_price_id,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '❌ INCOMPATÍVEL: Chave TESTE com Price ID de PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 
      '❌ INCOMPATÍVEL: Chave PRODUÇÃO com Price ID de TESTE'
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 
      '✅ COMPATÍVEL: Chave TESTE com Price ID de TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '✅ COMPATÍVEL: Chave PRODUÇÃO com Price ID de PRODUÇÃO'
    ELSE 
      '⚠️ VERIFICAR: Price ID não configurado ou formato desconhecido'
  END as status_compatibilidade
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true
  AND sp.is_active = true
ORDER BY sp.name;

-- ============================================
-- 5. RESUMO EXECUTIVO
-- ============================================
SELECT 
  '📊 RESUMO EXECUTIVO' as secao,
  (SELECT COUNT(*) FROM stripe_config WHERE is_active = true) as configs_ativas,
  (SELECT COUNT(*) FROM stripe_config WHERE environment = 'test' AND is_active = true) as configs_teste_ativas,
  (SELECT COUNT(*) FROM stripe_config WHERE environment = 'live' AND is_active = true) as configs_producao_ativas,
  (SELECT COUNT(*) FROM subscription_plans WHERE is_active = true) as planos_ativos,
  (SELECT COUNT(*) FROM subscription_plans WHERE stripe_price_id IS NOT NULL AND stripe_price_id != '') as planos_com_price_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stripe_config sc
      CROSS JOIN subscription_plans sp
      WHERE sc.is_active = true
        AND sp.is_active = true
        AND (
          (sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30) OR
          (sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0)
        )
    ) THEN '❌ INCOMPATIBILIDADE DETECTADA'
    ELSE '✅ SEM INCOMPATIBILIDADES APARENTES'
  END as status_geral;

-- ============================================
-- 6. RECOMENDAÇÕES BASEADAS NA CONFIGURAÇÃO ATUAL
-- ============================================
SELECT 
  '💡 RECOMENDAÇÕES' as secao,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM stripe_config WHERE is_active = true) THEN 
      '❌ Nenhuma configuração ativa encontrada. Crie uma configuração na tabela stripe_config e defina is_active = true.'
    WHEN (SELECT COUNT(*) FROM stripe_config WHERE is_active = true) > 1 THEN 
      '⚠️ Múltiplas configurações ativas detectadas. Apenas uma deve estar ativa por vez. Desative as outras.'
    WHEN EXISTS (
      SELECT 1 FROM stripe_config sc
      CROSS JOIN subscription_plans sp
      WHERE sc.is_active = true
        AND sp.is_active = true
        AND sc.secret_key LIKE 'sk_test_%' 
        AND LENGTH(sp.stripe_price_id) >= 30
    ) THEN 
      '❌ INCOMPATIBILIDADE: Você está usando chave de TESTE com Price ID de PRODUÇÃO. SOLUÇÕES: 1) Atualize a chave secreta para PRODUÇÃO (sk_live_...), OU 2) Crie um Price ID de TESTE no Stripe Dashboard e atualize o plano.'
    WHEN EXISTS (
      SELECT 1 FROM stripe_config sc
      CROSS JOIN subscription_plans sp
      WHERE sc.is_active = true
        AND sp.is_active = true
        AND sc.secret_key LIKE 'sk_live_%' 
        AND LENGTH(sp.stripe_price_id) < 30
        AND LENGTH(sp.stripe_price_id) > 0
    ) THEN 
      '❌ INCOMPATIBILIDADE: Você está usando chave de PRODUÇÃO com Price ID de TESTE. SOLUÇÕES: 1) Atualize o Price ID para um de PRODUÇÃO, OU 2) Use chaves de TESTE.'
    ELSE 
      '✅ Configuração parece estar correta. Se ainda houver erros, verifique se os IDs existem no Stripe Dashboard.'
  END as recomendacao;


