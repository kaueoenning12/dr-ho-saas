-- Script para verificar incompatibilidade entre chave e Price ID
-- O erro indica que o Price ID é de produção, mas a chave é de teste

-- 1. Verificar configuração ativa do Stripe
SELECT 
  '=== CONFIGURAÇÃO STRIPE ATIVA ===' as secao,
  id,
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN '✅ TESTE'
    ELSE '❌ INVÁLIDO'
  END as tipo_chave,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview
FROM stripe_config
WHERE is_active = true;

-- 2. Verificar Price ID no plano
SELECT 
  '=== PRICE ID NO PLANO ===' as secao,
  id,
  name,
  stripe_price_id,
  LENGTH(stripe_price_id) as price_id_length,
  CASE 
    WHEN LENGTH(stripe_price_id) >= 30 THEN '⚠️ PODE SER PRODUÇÃO (price IDs de produção são mais longos)'
    WHEN LENGTH(stripe_price_id) < 30 THEN '⚠️ PODE SER TESTE (price IDs de teste são mais curtos)'
    ELSE '❌ NÃO CONFIGURADO'
  END as tipo_price_id
FROM subscription_plans
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- 3. Verificar compatibilidade
SELECT 
  '=== COMPATIBILIDADE ===' as secao,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  sp.stripe_price_id,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '❌ INCOMPATÍVEL: Chave de TESTE com Price ID de PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 THEN 
      '❌ INCOMPATÍVEL: Chave de PRODUÇÃO com Price ID de TESTE'
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 THEN 
      '✅ COMPATÍVEL: Ambos são de TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '✅ COMPATÍVEL: Ambos são de PRODUÇÃO'
    ELSE 
      '⚠️ VERIFICAR MANUALMENTE'
  END as status_compatibilidade,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      'SOLUÇÃO: Use um Price ID de TESTE ou mude a chave para PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 THEN 
      'SOLUÇÃO: Use um Price ID de PRODUÇÃO ou mude a chave para TESTE'
    ELSE 
      'N/A'
  END as recomendacao
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true 
  AND sp.id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';


