-- Corrigir configurações do Stripe: desativar a configuração errada e ativar a correta
-- A config com environment='live' já tem as chaves de produção e deve ser ativa

-- Primeiro desativar a config 'test' que está com chaves de produção (errado)
UPDATE stripe_config 
SET is_active = false, updated_at = now()
WHERE id = '58916a36-3e04-4684-bb28-755d56b1ee57';

-- Ativar a config 'live' que está com chaves de produção (correto)
UPDATE stripe_config 
SET is_active = true, updated_at = now()
WHERE id = 'b17b0bd7-b674-4e5b-85fb-b85bb1b5b94d';