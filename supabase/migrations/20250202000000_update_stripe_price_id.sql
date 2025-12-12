-- Atualizar Price ID do Stripe para o ID correto
-- Price ID correto: price_1SdFEiRpUByu4yV9NB4rlLe6
UPDATE subscription_plans 
SET 
  stripe_price_id = 'price_1SdFEiRpUByu4yV9NB4rlLe6',
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Verificar atualização
SELECT 
  id, 
  name, 
  price, 
  stripe_product_id, 
  stripe_price_id,
  is_active,
  updated_at
FROM subscription_plans 
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';



