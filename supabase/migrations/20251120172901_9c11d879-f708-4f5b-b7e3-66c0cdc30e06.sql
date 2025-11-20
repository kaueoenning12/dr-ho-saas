-- Fase 1: Adicionar colunas Stripe à tabela subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN subscription_plans.stripe_product_id IS 'ID do produto no Stripe (formato: prod_xxxxx)';
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'ID do preço no Stripe (formato: price_xxxxx)';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product 
ON subscription_plans(stripe_product_id) 
WHERE stripe_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price 
ON subscription_plans(stripe_price_id) 
WHERE stripe_price_id IS NOT NULL;