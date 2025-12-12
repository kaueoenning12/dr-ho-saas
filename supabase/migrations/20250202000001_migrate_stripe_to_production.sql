-- Migration: Migrar Stripe de Teste para Produção
-- Este script desativa a configuração de teste e cria/atualiza a configuração de produção
-- IMPORTANTE: Substitua os valores placeholder pelos valores reais de produção antes de executar

-- Passo 1: Desativar todas as configurações existentes (test e live)
UPDATE stripe_config
SET is_active = false
WHERE is_active = true;

-- Passo 2: Criar ou atualizar configuração de produção
-- Se já existir uma configuração com environment = 'live', atualiza
-- Caso contrário, cria uma nova
INSERT INTO stripe_config (
  environment,
  publishable_key,
  secret_key,
  webhook_secret,
  default_product_id,
  default_price_id,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'live',
  'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- SUBSTITUIR: Sua chave pública de produção
  'sk_live_XXXXXXXXXXXXXXXXXXXXXXXX',  -- SUBSTITUIR: Sua chave secreta de produção
  'whsec_XXXXXXXXXXXXXXXXXXXXXXXX',    -- SUBSTITUIR: Seu webhook secret de produção
  'prod_XXXXXXXXXXXXXXXXXXXXXXXX',     -- SUBSTITUIR: Product ID de produção (opcional)
  'price_XXXXXXXXXXXXXXXXXXXXXXXX',    -- SUBSTITUIR: Price ID de produção (opcional)
  true,                                -- Ativar esta configuração
  NOW(),
  NOW()
)
ON CONFLICT (environment) 
DO UPDATE SET
  publishable_key = EXCLUDED.publishable_key,
  secret_key = EXCLUDED.secret_key,
  webhook_secret = EXCLUDED.webhook_secret,
  default_product_id = EXCLUDED.default_product_id,
  default_price_id = EXCLUDED.default_price_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Passo 3: Verificar que apenas uma configuração está ativa
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM stripe_config
  WHERE is_active = true;
  
  IF active_count > 1 THEN
    RAISE EXCEPTION 'ERRO: Mais de uma configuração está ativa. Verifique a tabela stripe_config.';
  ELSIF active_count = 0 THEN
    RAISE WARNING 'AVISO: Nenhuma configuração está ativa. Verifique se a configuração de produção foi criada corretamente.';
  ELSE
    RAISE NOTICE 'SUCESSO: Exatamente uma configuração está ativa.';
  END IF;
END $$;

-- Passo 4: Validar formato das chaves
DO $$
DECLARE
  config_record RECORD;
BEGIN
  SELECT * INTO config_record
  FROM stripe_config
  WHERE is_active = true
  LIMIT 1;
  
  IF config_record IS NULL THEN
    RAISE EXCEPTION 'ERRO: Nenhuma configuração ativa encontrada.';
  END IF;
  
  -- Validar publishable_key
  IF config_record.publishable_key NOT LIKE 'pk_live_%' THEN
    RAISE EXCEPTION 'ERRO: publishable_key deve começar com pk_live_ (configuração de produção)';
  END IF;
  
  -- Validar secret_key
  IF config_record.secret_key NOT LIKE 'sk_live_%' THEN
    RAISE EXCEPTION 'ERRO: secret_key deve começar com sk_live_ (configuração de produção)';
  END IF;
  
  -- Validar webhook_secret (se fornecido)
  IF config_record.webhook_secret IS NOT NULL AND config_record.webhook_secret NOT LIKE 'whsec_%' THEN
    RAISE WARNING 'AVISO: webhook_secret deve começar com whsec_';
  END IF;
  
  RAISE NOTICE 'SUCESSO: Formato das chaves validado corretamente.';
END $$;

-- Verificar resultado final
SELECT 
  id,
  environment,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  is_active,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  CASE 
    WHEN webhook_secret IS NOT NULL THEN 'Configurado'
    ELSE 'Não configurado'
  END as webhook_status,
  default_product_id,
  default_price_id,
  created_at,
  updated_at
FROM stripe_config
ORDER BY is_active DESC, environment;



