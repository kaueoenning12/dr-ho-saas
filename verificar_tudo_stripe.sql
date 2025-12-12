-- ============================================
-- SCRIPT COMPLETO DE VERIFICAÇÃO DO STRIPE
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. VERIFICAR CONFIGURAÇÃO DO STRIPE NO BANCO
-- ============================================
SELECT 
  '📋 CONFIGURAÇÃO DO STRIPE' as secao,
  id,
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_test_%' THEN '❌ TESTE'
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_secret_key,
  CASE 
    WHEN publishable_key LIKE 'pk_test_%' THEN '❌ TESTE'
    WHEN publishable_key LIKE 'pk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_publishable_key,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  created_at,
  updated_at
FROM stripe_config
ORDER BY is_active DESC, environment;

-- ============================================
-- 2. VERIFICAR PLANOS E PRICE IDs
-- ============================================
SELECT 
  '📦 PLANOS E PRICE IDs' as secao,
  id,
  name,
  price,
  stripe_product_id,
  stripe_price_id,
  CASE 
    WHEN LENGTH(stripe_price_id) >= 30 THEN '✅ PRODUÇÃO (ID longo)'
    WHEN LENGTH(stripe_price_id) < 30 AND LENGTH(stripe_price_id) > 0 THEN '❌ TESTE (ID curto)'
    ELSE '⚠️ NÃO CONFIGURADO'
  END as tipo_price_id,
  LENGTH(stripe_price_id) as price_id_length,
  is_active
FROM subscription_plans
ORDER BY is_active DESC, created_at DESC;

-- ============================================
-- 3. VERIFICAR COMPATIBILIDADE
-- ============================================
SELECT 
  '🔍 VERIFICAÇÃO DE COMPATIBILIDADE' as secao,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' THEN '❌ TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_chave_secreta,
  sp.name as plan_name,
  sp.stripe_price_id,
  CASE 
    WHEN LENGTH(sp.stripe_price_id) >= 30 THEN '✅ PRODUÇÃO'
    WHEN LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN '❌ TESTE'
    ELSE '⚠️ NÃO CONFIGURADO'
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
-- 4. RESUMO EXECUTIVO
-- ============================================
SELECT 
  '📊 RESUMO EXECUTIVO' as secao,
  (SELECT COUNT(*) FROM stripe_config WHERE is_active = true) as configs_ativas,
  (SELECT COUNT(*) FROM stripe_config WHERE environment = 'live' AND is_active = true) as configs_producao_ativas,
  (SELECT COUNT(*) FROM stripe_config WHERE environment = 'test' AND is_active = true) as configs_teste_ativas,
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
-- 5. RECOMENDAÇÕES
-- ============================================
SELECT 
  '💡 RECOMENDAÇÕES' as secao,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM stripe_config WHERE is_active = true) THEN 
      '❌ Nenhuma configuração ativa. Crie uma configuração na tabela stripe_config e defina is_active = true.'
    WHEN (SELECT COUNT(*) FROM stripe_config WHERE is_active = true) > 1 THEN 
      '⚠️ Múltiplas configurações ativas. Apenas uma deve estar ativa por vez. Desative as outras.'
    WHEN EXISTS (
      SELECT 1 FROM stripe_config sc
      CROSS JOIN subscription_plans sp
      WHERE sc.is_active = true
        AND sp.is_active = true
        AND sc.secret_key LIKE 'sk_test_%' 
        AND LENGTH(sp.stripe_price_id) >= 30
    ) THEN 
      '❌ INCOMPATIBILIDADE: Chave de TESTE com Price ID de PRODUÇÃO. SOLUÇÃO: Atualize a chave para PRODUÇÃO ou use um Price ID de TESTE.'
    WHEN EXISTS (
      SELECT 1 FROM stripe_config sc
      CROSS JOIN subscription_plans sp
      WHERE sc.is_active = true
        AND sp.is_active = true
        AND sc.secret_key LIKE 'sk_live_%' 
        AND LENGTH(sp.stripe_price_id) < 30
        AND LENGTH(sp.stripe_price_id) > 0
    ) THEN 
      '❌ INCOMPATIBILIDADE: Chave de PRODUÇÃO com Price ID de TESTE. SOLUÇÃO: Atualize o Price ID para PRODUÇÃO ou use chaves de TESTE.'
    ELSE 
      '✅ Configuração parece estar correta. Se ainda houver erros, verifique: 1) Se os IDs existem no Stripe Dashboard, 2) Se a variável de ambiente STRIPE_SECRET_KEY no Supabase não está sobrescrevendo o banco.'
  END as recomendacao;

