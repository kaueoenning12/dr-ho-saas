-- Fase 2: Atualizar plano Premium com novos dados
UPDATE subscription_plans 
SET 
  name = 'DR HO - PREMIUM',
  description = 'DR HO - PREMIUM',
  price = 478.80,
  stripe_product_id = 'prod_TSWakKwcPp5V0a',
  stripe_price_id = 'price_1SVbXX2MC0MvWzlWBylVTFjT',
  features = jsonb_build_array(
    'Acesso completo a todos os relatórios',
    'Identificação correta de riscos ocupacionais',
    'Relatórios simples e detalhados',
    'Segurança na tomada de decisões',
    'Suporte especializado',
    'Atualizações constantes de conteúdo'
  ),
  updated_at = NOW()
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';