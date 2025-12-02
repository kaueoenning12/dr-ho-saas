-- Migration to update subscription plan with Stripe Product ID
-- This updates the plan to use the Stripe product: prod_TSUjx4c42eILF8

-- Update or insert the main subscription plan "Assinatura DR. HO"
-- Note: You need to create a Price in Stripe dashboard and set stripe_price_id manually
-- Or the system will create prices dynamically using the product_id

DO $$
DECLARE
  plan_id UUID;
BEGIN
  -- Try to find existing plan by name
  SELECT id INTO plan_id
  FROM public.subscription_plans
  WHERE name = 'Assinatura DR. HO'
  LIMIT 1;

  IF plan_id IS NOT NULL THEN
    -- Update existing plan
    UPDATE public.subscription_plans
    SET 
      stripe_product_id = 'prod_TSUjx4c42eILF8',
      name = 'Assinatura DR. HO',
      description = 'Plano anual com acesso completo a todos os relatórios de riscos ocupacionais',
      price = 1.00, -- Preço de teste (R$ 1,00)
      is_active = true,
      updated_at = now()
    WHERE id = plan_id;

    RAISE NOTICE 'Plano atualizado: %', plan_id;
  ELSE
    -- Create new plan if it doesn't exist
    INSERT INTO public.subscription_plans (
      name,
      description,
      price,
      features,
      stripe_product_id,
      is_active
    ) VALUES (
      'Assinatura DR. HO',
      'Plano anual com acesso completo a todos os relatórios de riscos ocupacionais',
      1.00, -- Preço de teste (R$ 1,00)
      '["Acesso ilimitado a todos os relatórios", "Novos relatórios quinzenais", "Suporte via comentários", "Acesso via web e mobile"]'::jsonb,
      'prod_TSUjx4c42eILF8',
      true
    ) RETURNING id INTO plan_id;

    RAISE NOTICE 'Novo plano criado: %', plan_id;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.stripe_product_id IS 'Stripe Product ID. Se configurado, o sistema usará este produto ao invés de criar dinamicamente. Produto atual: prod_TSUjx4c42eILF8';


