-- ============================================
-- CORREÇÃO DE INCOMPATIBILIDADE STRIPE
-- ============================================
-- 
-- PROBLEMA: A chave secreta e o Price ID devem ser do mesmo ambiente
-- - Se a chave é sk_live_... (PRODUÇÃO), o Price ID deve ser de PRODUÇÃO
-- - Se a chave é sk_test_... (TESTE), o Price ID deve ser de TESTE
--
-- ============================================
-- OPÇÃO 1: ATUALIZAR A CHAVE PARA PRODUÇÃO
-- ============================================
-- Use esta query se você quer usar PRODUÇÃO (recomendado para produção)
-- Substitua 'sua_chave_secreta_live_aqui' pela sua chave de produção do Stripe

-- UPDATE stripe_config
-- SET 
--   secret_key = 'sua_chave_secreta_live_aqui',
--   environment = 'live',
--   publishable_key = 'sua_chave_publica_live_aqui'  -- Substitua pela sua chave pública
-- WHERE is_active = true;

-- ============================================
-- OPÇÃO 2: ATUALIZAR O PRICE ID PARA TESTE
-- ============================================
-- Use esta query se você quer usar TESTE (apenas para desenvolvimento)
-- Substitua 'price_id_teste_aqui' pelo Price ID de teste do Stripe
-- E substitua 'id_do_plano_aqui' pelo ID do plano que você quer atualizar

-- UPDATE subscription_plans
-- SET 
--   stripe_price_id = 'price_id_teste_aqui'
-- WHERE id = 'id_do_plano_aqui';

-- ============================================
-- VERIFICAR ANTES DE ATUALIZAR
-- ============================================
-- Execute estas queries primeiro para ver o estado atual:

-- 1. Ver configuração atual do Stripe
SELECT 
  id,
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  SUBSTRING(secret_key, 1, 12) || '...' as chave_preview,
  SUBSTRING(publishable_key, 1, 12) || '...' as publishable_key_preview
FROM stripe_config
WHERE is_active = true;

-- 2. Ver Price IDs dos planos
SELECT 
  id,
  name,
  stripe_price_id,
  CASE 
    WHEN stripe_price_id IS NULL THEN 'NÃO CONFIGURADO'
    WHEN CHAR_LENGTH(stripe_price_id) < 30 THEN 'PODE SER TESTE'
    ELSE 'PODE SER PRODUÇÃO'
  END as tipo_price_id
FROM subscription_plans
WHERE is_active = true;

-- ============================================
-- EXEMPLO: ATUALIZAR PARA PRODUÇÃO
-- ============================================
-- Descomente e ajuste os valores abaixo:

-- UPDATE stripe_config
-- SET 
--   secret_key = 'sk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- Sua chave secreta de produção
--   publishable_key = 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- Sua chave pública de produção
--   environment = 'live',
--   updated_at = NOW()
-- WHERE is_active = true
-- RETURNING id, environment, is_active;

-- ============================================
-- EXEMPLO: ATUALIZAR PRICE ID DO PLANO
-- ============================================
-- Descomente e ajuste os valores abaixo:

-- UPDATE subscription_plans
-- SET 
--   stripe_price_id = 'price_XXXXXXXXXXXXXXXXXXXXXXXX',  -- Seu Price ID de produção
--   updated_at = NOW()
-- WHERE name = 'DR HO - PREMIUM'  -- Ou use WHERE id = 'id_do_plano'
-- RETURNING id, name, stripe_price_id;




