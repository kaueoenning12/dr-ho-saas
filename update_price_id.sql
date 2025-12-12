-- Script SQL para atualizar o Price ID do Stripe manualmente
-- Execute este script no Supabase SQL Editor se a migration não for aplicada automaticamente

-- IMPORTANTE: O Price ID correto é: price_1SdFEiRpUByu4yV9NB4rlLe6
-- O Price ID incorreto que estava causando erro: price_1SdFJD2MC0MvWzlWSMTIiVQ4

-- Verificar Price ID atual ANTES da atualização
SELECT 
  'ANTES DA ATUALIZAÇÃO' as status,
  id, 
  name, 
  price, 
  stripe_product_id, 
  stripe_price_id as price_id_atual,
  is_active,
  updated_at
FROM subscription_plans 
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Atualizar Price ID do Stripe para o ID correto
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SdFEiRpUByu4yV9NB4rlLe6',
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Verificar atualização DEPOIS
SELECT 
  'DEPOIS DA ATUALIZAÇÃO' as status,
  id, 
  name, 
  price, 
  stripe_product_id, 
  stripe_price_id as price_id_atualizado,
  CASE 
    WHEN stripe_price_id = 'price_1SdFEiRpUByu4yV9NB4rlLe6' THEN '✅ CORRETO'
    ELSE '❌ AINDA INCORRETO'
  END as validacao,
  is_active,
  updated_at
FROM subscription_plans 
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

