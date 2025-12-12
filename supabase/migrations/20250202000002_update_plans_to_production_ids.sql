-- Migration: Atualizar Planos com IDs de Produção do Stripe
-- IMPORTANTE: Substitua os valores placeholder pelos IDs reais de produção antes de executar

-- Atualizar plano DR HO - PREMIUM com IDs de produção
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_XXXXXXXXXXXXXXXXXXXXXXXX',  -- SUBSTITUIR: Product ID de produção
  stripe_price_id = 'price_XXXXXXXXXXXXXXXXXXXXXXXX',   -- SUBSTITUIR: Price ID de produção
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

-- Validar que os IDs foram atualizados corretamente
DO $$
DECLARE
  plan_record RECORD;
  config_record RECORD;
  is_compatible BOOLEAN := false;
BEGIN
  -- Buscar plano atualizado
  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';
  
  IF plan_record IS NULL THEN
    RAISE EXCEPTION 'ERRO: Plano não encontrado.';
  END IF;
  
  -- Buscar configuração ativa do Stripe
  SELECT * INTO config_record
  FROM stripe_config
  WHERE is_active = true
  LIMIT 1;
  
  IF config_record IS NULL THEN
    RAISE WARNING 'AVISO: Nenhuma configuração do Stripe está ativa.';
  ELSE
    -- Verificar compatibilidade
    -- Se a chave é live, o price_id deve ser de produção (geralmente mais longo)
    IF config_record.secret_key LIKE 'sk_live_%' THEN
      IF plan_record.stripe_price_id IS NOT NULL AND LENGTH(plan_record.stripe_price_id) >= 30 THEN
        is_compatible := true;
      END IF;
    ELSIF config_record.secret_key LIKE 'sk_test_%' THEN
      IF plan_record.stripe_price_id IS NOT NULL AND LENGTH(plan_record.stripe_price_id) < 30 THEN
        is_compatible := true;
      END IF;
    END IF;
    
    IF NOT is_compatible THEN
      RAISE WARNING 'AVISO: Price ID pode ser incompatível com a chave configurada. Verifique manualmente no Stripe Dashboard.';
    ELSE
      RAISE NOTICE 'SUCESSO: Price ID parece compatível com a configuração ativa.';
    END IF;
  END IF;
  
  -- Validar formato dos IDs
  IF plan_record.stripe_product_id IS NOT NULL AND plan_record.stripe_product_id NOT LIKE 'prod_%' THEN
    RAISE WARNING 'AVISO: stripe_product_id deve começar com prod_';
  END IF;
  
  IF plan_record.stripe_price_id IS NOT NULL AND plan_record.stripe_price_id NOT LIKE 'price_%' THEN
    RAISE EXCEPTION 'ERRO: stripe_price_id deve começar com price_';
  END IF;
  
  RAISE NOTICE 'SUCESSO: IDs atualizados e validados.';
END $$;

-- Verificar resultado final
SELECT 
  id,
  name,
  price,
  stripe_product_id,
  stripe_price_id,
  CASE 
    WHEN stripe_price_id IS NULL THEN 'NÃO CONFIGURADO'
    WHEN LENGTH(stripe_price_id) < 30 THEN 'PODE SER TESTE'
    ELSE 'PODE SER PRODUÇÃO'
  END as tipo_price_id,
  is_active,
  updated_at
FROM subscription_plans
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';



