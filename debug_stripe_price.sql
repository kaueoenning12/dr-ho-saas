-- Query para verificar detalhes do Price ID e possíveis problemas
SELECT 
  id,
  name,
  stripe_price_id,
  -- Verificar se há espaços ou caracteres especiais
  CHAR_LENGTH(stripe_price_id) as length_price_id,
  CHAR_LENGTH(TRIM(stripe_price_id)) as length_trimmed,
  -- Verificar se começa com price_
  CASE 
    WHEN stripe_price_id LIKE 'price_%' THEN 'SIM'
    ELSE 'NÃO'
  END as comeca_com_price,
  -- Verificar se tem espaços
  CASE 
    WHEN stripe_price_id LIKE '% %' THEN 'TEM ESPAÇOS'
    ELSE 'SEM ESPAÇOS'
  END as tem_espacos,
  -- Verificar se tem quebras de linha ou tabs
  CASE 
    WHEN stripe_price_id LIKE '%' || CHR(10) || '%' OR stripe_price_id LIKE '%' || CHR(13) || '%' OR stripe_price_id LIKE '%' || CHR(9) || '%' THEN 'TEM QUEBRAS'
    ELSE 'SEM QUEBRAS'
  END as tem_quebras,
  -- Mostrar primeiros e últimos caracteres
  SUBSTRING(stripe_price_id, 1, 20) || '...' || SUBSTRING(stripe_price_id, GREATEST(1, CHAR_LENGTH(stripe_price_id) - 10)) as preview_price_id,
  -- Mostrar o price ID completo (para copiar)
  stripe_price_id as price_id_completo
FROM subscription_plans
WHERE is_active = true;

-- Query para verificar a configuração do Stripe
SELECT 
  id,
  environment,
  is_active,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave
FROM stripe_config
WHERE is_active = true;




