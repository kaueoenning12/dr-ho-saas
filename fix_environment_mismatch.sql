-- Script para corrigir incompatibilidade entre chave e Price ID
-- ERRO: "a similar object exists in live mode, but a test mode key was used"
-- 
-- Isso significa que:
-- - O Price ID é de PRODUÇÃO (live mode)
-- - A chave secreta é de TESTE (test mode)
-- 
-- SOLUÇÃO: Você tem 2 opções:
-- 1. Usar chave de PRODUÇÃO (se quiser ir para produção)
-- 2. Usar Price ID de TESTE (se quiser continuar em teste)

-- ============================================
-- VERIFICAR SITUAÇÃO ATUAL
-- ============================================
SELECT 
  '=== SITUAÇÃO ATUAL ===' as secao,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  sp.stripe_price_id,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '❌ PROBLEMA: Chave de TESTE com Price ID de PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 THEN 
      '❌ PROBLEMA: Chave de PRODUÇÃO com Price ID de TESTE'
    ELSE 
      '✅ COMPATÍVEL'
  END as status
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true 
  AND sp.id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- ============================================
-- OPÇÃO 1: MANTER EM TESTE (usar Price ID de teste)
-- ============================================
-- Se você quer continuar em modo TESTE, precisa usar um Price ID de TESTE
-- 
-- INSTRUÇÕES:
-- 1. Acesse: https://dashboard.stripe.com/test/products
-- 2. Encontre ou crie um produto de teste
-- 3. Crie um preço de R$ 478,80/ano
-- 4. Copie o Price ID (deve começar com price_ e ser mais curto, < 30 caracteres)
-- 5. Execute o UPDATE abaixo substituindo 'price_XXXXX' pelo Price ID de teste

-- UPDATE subscription_plans 
-- SET 
--   stripe_price_id = 'price_XXXXX',  -- SUBSTITUIR: Price ID de TESTE
--   updated_at = NOW()
-- WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- ============================================
-- OPÇÃO 2: IR PARA PRODUÇÃO (usar chave de produção)
-- ============================================
-- Se você quer usar o Price ID de produção, precisa usar chaves de produção
-- 
-- INSTRUÇÕES:
-- 1. Obtenha as chaves de produção do Stripe Dashboard (modo Live)
-- 2. Execute o UPDATE abaixo substituindo pelos valores reais

-- Primeiro, desativar configuração de teste
-- UPDATE stripe_config
-- SET is_active = false
-- WHERE environment = 'test';

-- Depois, criar/atualizar configuração de produção
-- INSERT INTO stripe_config (
--   environment,
--   publishable_key,
--   secret_key,
--   is_active
-- )
-- VALUES (
--   'live',
--   'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- SUBSTITUIR: Chave pública de produção
--   'sk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- SUBSTITUIR: Chave secreta de produção
--   true
-- )
-- ON CONFLICT (environment) 
-- DO UPDATE SET
--   publishable_key = EXCLUDED.publishable_key,
--   secret_key = EXCLUDED.secret_key,
--   is_active = EXCLUDED.is_active,
--   updated_at = NOW();

-- ============================================
-- VERIFICAR APÓS CORREÇÃO
-- ============================================
SELECT 
  '=== VERIFICAÇÃO APÓS CORREÇÃO ===' as secao,
  sc.environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  sp.stripe_price_id,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 THEN 
      '✅ COMPATÍVEL: Ambos são de TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '✅ COMPATÍVEL: Ambos são de PRODUÇÃO'
    ELSE 
      '❌ AINDA INCOMPATÍVEL'
  END as status_final
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true 
  AND sp.id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';


