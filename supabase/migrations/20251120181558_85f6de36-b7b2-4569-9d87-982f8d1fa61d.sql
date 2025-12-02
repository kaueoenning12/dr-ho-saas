-- Atualizar plano Premium com IDs corretos do Stripe
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_TSWvb9EnmOlvLY',
  stripe_price_id = 'price_1SVbrGRpUByu4yV90IEbFTqe',
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';