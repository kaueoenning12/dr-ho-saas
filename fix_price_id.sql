-- Script para corrigir o Price ID do Stripe
-- O Price ID correto é: price_1SdFEiRpUByu4yV9NB4rlLe6

-- Verificar Price ID atual
SELECT 
  id,
  name,
  stripe_price_id as price_id_atual,
  stripe_product_id as product_id_atual
FROM subscription_plans
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Atualizar para o Price ID correto
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SdFEiRpUByu4yV9NB4rlLe6',
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Verificar atualização
SELECT 
  id,
  name,
  stripe_price_id as price_id_atualizado,
  stripe_product_id as product_id,
  updated_at
FROM subscription_plans
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';



