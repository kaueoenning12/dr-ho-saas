# 🔍 Guia Completo: Verificação e Configuração do Stripe

## 📋 Passo a Passo Completo

### ✅ PASSO 1: Verificar Logs da Edge Function no Supabase

**IMPORTANTE:** Precisamos ver os logs da Edge Function para saber qual chave está sendo usada.

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** → **create-checkout-session**
4. Clique em **Logs** (ou **View Logs**)
5. Procure pelos logs mais recentes após tentar fazer checkout
6. Procure por estas mensagens:
   - `🔍 Iniciando busca de configuração no banco...`
   - `📊 Resultado da busca de configuração:`
   - `🔧 CHAVE FINAL QUE SERÁ USADA:`
   - `⚠️ Usando secret_key do fallback`

**O que verificar:**
- `secretKeySource`: Deve ser `'Banco de Dados (stripe_config)'` (NÃO `'Variável de Ambiente (Deno.env)'`)
- `secretKeyType`: Deve ser `'PRODUCTION'` (NÃO `'TEST'`)
- Se aparecer `⚠️ Usando secret_key do fallback`, significa que está usando variável de ambiente

---

### ✅ PASSO 2: Verificar Configuração no Banco de Dados

Execute este SQL no **Supabase SQL Editor**:

```sql
-- Verificar configuração ativa
SELECT 
  id,
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_test_%' THEN '❌ TESTE'
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_secret_key,
  CASE 
    WHEN publishable_key LIKE 'pk_test_%' THEN '❌ TESTE'
    WHEN publishable_key LIKE 'pk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_publishable_key,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview,
  created_at,
  updated_at
FROM stripe_config
ORDER BY is_active DESC, environment;
```

**Resultado esperado:**
- ✅ Uma linha com `is_active = true`
- ✅ `environment = 'live'` (ou 'test' se ainda estiver em teste)
- ✅ `tipo_secret_key = '✅ PRODUÇÃO'`
- ✅ `tipo_publishable_key = '✅ PRODUÇÃO'`

**Se não estiver correto:**
```sql
-- Atualizar para produção (SUBSTITUA OS VALORES)
UPDATE stripe_config
SET 
  environment = 'live',
  secret_key = 'sk_live_SUA_CHAVE_AQUI',
  publishable_key = 'pk_live_SUA_CHAVE_AQUI',
  is_active = true,
  updated_at = now()
WHERE environment = 'live';

-- Desativar configuração de teste
UPDATE stripe_config
SET is_active = false
WHERE environment = 'test';
```

---

### ✅ PASSO 3: Verificar Variáveis de Ambiente no Supabase

**CRÍTICO:** A variável de ambiente pode estar sobrescrevendo o banco!

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Project Settings** → **Edge Functions** → **Secrets**
4. Procure por `STRIPE_SECRET_KEY`

**Se existir:**
- **Opção A (Recomendado):** DELETE a variável `STRIPE_SECRET_KEY`
  - Clique no ícone de lixeira ao lado da variável
  - Confirme a exclusão
  - Isso força a Edge Function a usar apenas o banco de dados

- **Opção B:** Atualize para a chave de PRODUÇÃO
  - Clique em **Edit**
  - Atualize o valor para `sk_live_...` (sua chave de produção)
  - Salve

**⚠️ IMPORTANTE:** Se a variável existir com chave de TESTE, ela terá prioridade sobre o banco!

---

### ✅ PASSO 4: Verificar Plano no Banco de Dados

Execute este SQL:

```sql
-- Verificar plano e Price ID
SELECT 
  id,
  name,
  price,
  stripe_product_id,
  stripe_price_id,
  CASE 
    WHEN LENGTH(stripe_price_id) >= 30 THEN '✅ PRODUÇÃO (ID longo)'
    WHEN LENGTH(stripe_price_id) < 30 AND LENGTH(stripe_price_id) > 0 THEN '❌ TESTE (ID curto)'
    ELSE '⚠️ NÃO CONFIGURADO'
  END as tipo_price_id,
  LENGTH(stripe_price_id) as price_id_length,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY created_at DESC;
```

**Resultado esperado:**
- ✅ `stripe_price_id` deve ter 30+ caracteres (produção)
- ✅ `tipo_price_id = '✅ PRODUÇÃO (ID longo)'`
- ✅ `stripe_product_id` deve começar com `prod_`

**Se o Price ID estiver errado:**
```sql
-- Atualizar Price ID (SUBSTITUA O VALOR)
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_1SdFEiRpUByu4yV9NB4rlLe6', -- Seu Price ID de produção
  updated_at = now()
WHERE id = '0d2a8f57-1e9f-4126-8195-de07800085e9'; -- ID do seu plano
```

---

### ✅ PASSO 5: Verificar no Stripe Dashboard

#### 5.1. Verificar Chaves API

1. Acesse: https://dashboard.stripe.com/apikeys
2. **Certifique-se de estar em modo LIVE** (não Test mode)
3. Verifique:
   - **Publishable key** deve começar com `pk_live_...`
   - **Secret key** deve começar com `sk_live_...`
4. Compare com as chaves no banco de dados

#### 5.2. Verificar Product ID

1. Acesse: https://dashboard.stripe.com/products
2. **Certifique-se de estar em modo LIVE**
3. Procure pelo produto com ID: `prod_TaQ4Kguvqz2YaS`
4. Se não encontrar:
   - Crie um novo produto
   - Anote o Product ID (começa com `prod_`)
   - Atualize no banco de dados

#### 5.3. Verificar Price ID

1. Acesse o produto `prod_TaQ4Kguvqz2YaS`
2. Procure pelo Price ID: `price_1SdFEiRpUByu4yV9NB4rlLe6`
3. Verifique:
   - ✅ O Price está **ATIVO** (não arquivado)
   - ✅ O Price ID tem 30+ caracteres
   - ✅ O valor está correto (R$ 1,00 ou o valor desejado)
   - ✅ A moeda é BRL
   - ✅ O tipo é "Recurring" (recorrente)

**Se o Price ID não existir ou estiver arquivado:**
1. Clique em **"Add another price"** no produto
2. Configure:
   - **Price:** 1.00 (ou o valor desejado)
   - **Currency:** BRL
   - **Billing period:** Yearly (ou o período desejado)
   - **Recurring:** Sim
3. Salve e anote o **novo Price ID**
4. Atualize no banco de dados:

```sql
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_NOVO_ID_AQUI',
  updated_at = now()
WHERE id = '0d2a8f57-1e9f-4126-8195-de07800085e9';
```

---

### ✅ PASSO 6: Verificar Compatibilidade

Execute este SQL para verificar se tudo está compatível:

```sql
-- Verificar compatibilidade entre chave e Price ID
SELECT 
  '🔍 VERIFICAÇÃO DE COMPATIBILIDADE' as verificacao,
  sc.environment as config_environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' THEN '❌ TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_chave_secreta,
  sp.name as plan_name,
  sp.stripe_price_id,
  CASE 
    WHEN LENGTH(sp.stripe_price_id) >= 30 THEN '✅ PRODUÇÃO'
    WHEN LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN '❌ TESTE'
    ELSE '⚠️ NÃO CONFIGURADO'
  END as tipo_price_id,
  CASE 
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '❌ INCOMPATÍVEL: Chave TESTE com Price ID de PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 
      '❌ INCOMPATÍVEL: Chave PRODUÇÃO com Price ID de TESTE'
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 AND LENGTH(sp.stripe_price_id) > 0 THEN 
      '✅ COMPATÍVEL: Chave TESTE com Price ID de TESTE'
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN 
      '✅ COMPATÍVEL: Chave PRODUÇÃO com Price ID de PRODUÇÃO'
    ELSE 
      '⚠️ VERIFICAR: Price ID não configurado ou formato desconhecido'
  END as status_compatibilidade
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true
  AND sp.is_active = true
ORDER BY sp.name;
```

**Resultado esperado:**
- ✅ `tipo_chave_secreta = '✅ PRODUÇÃO'`
- ✅ `tipo_price_id = '✅ PRODUÇÃO'`
- ✅ `status_compatibilidade = '✅ COMPATÍVEL: Chave PRODUÇÃO com Price ID de PRODUÇÃO'`

---

### ✅ PASSO 7: Redeploy da Edge Function (Se necessário)

Se você alterou a configuração, pode ser necessário fazer redeploy:

1. No terminal, execute:
```bash
cd /home/kaue-oenning/grupo\ nexusmind/dr-ho-saas-main\ \(12\)/dr-ho-saas-main
npx supabase functions deploy create-checkout-session
```

2. Aguarde o deploy terminar

---

### ✅ PASSO 8: Testar Novamente

1. Limpe o cache do navegador (Ctrl + Shift + R)
2. Tente fazer checkout novamente
3. Abra o Console do navegador (F12)
4. Verifique os logs:
   - `🔑 [CHECKOUT] Configurações do Stripe que serão usadas:`
   - `📊 [CHECKOUT] RESUMO FINAL`
5. Verifique os logs da Edge Function no Supabase Dashboard
6. Procure por: `🔧 CHAVE FINAL QUE SERÁ USADA:`

---

## 🚨 Checklist Final

Antes de testar, verifique:

- [ ] **Banco de Dados:**
  - [ ] Configuração ativa com `is_active = true`
  - [ ] `environment = 'live'`
  - [ ] `secret_key` começa com `sk_live_...`
  - [ ] `publishable_key` começa com `pk_live_...`

- [ ] **Variáveis de Ambiente (Supabase):**
  - [ ] `STRIPE_SECRET_KEY` foi **REMOVIDA** ou atualizada para produção
  - [ ] Não há variável de ambiente com chave de teste

- [ ] **Plano:**
  - [ ] `stripe_price_id` tem 30+ caracteres
  - [ ] `stripe_product_id` começa com `prod_`
  - [ ] Plano está ativo (`is_active = true`)

- [ ] **Stripe Dashboard:**
  - [ ] Modo LIVE ativado
  - [ ] Product ID existe e está ativo
  - [ ] Price ID existe e está ativo (não arquivado)
  - [ ] Chaves API são de produção (`pk_live_...` e `sk_live_...`)

- [ ] **Compatibilidade:**
  - [ ] Chave secreta é PRODUÇÃO
  - [ ] Price ID é PRODUÇÃO
  - [ ] Ambos são compatíveis

---

## 🔍 Como Verificar os Logs da Edge Function

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** → **create-checkout-session**
4. Clique em **Logs**
5. Procure pelos logs mais recentes
6. Procure por estas mensagens chave:

```
🔍 Iniciando busca de configuração no banco...
📊 Resultado da busca de configuração:
✅ Usando secret_key do Supabase (stripe_config)
⚠️ Usando secret_key do fallback (NÃO RECOMENDADO)
🔧 CHAVE FINAL QUE SERÁ USADA:
```

**O que procurar:**
- Se aparecer `⚠️ Usando secret_key do fallback`, a variável de ambiente está sendo usada
- Se aparecer `✅ Usando secret_key do Supabase`, o banco está sendo usado
- Verifique `secretKeySource` e `secretKeyType` nos logs

---

## 📞 Se Ainda Não Funcionar

Se após seguir todos os passos ainda houver erro:

1. **Copie os logs completos** da Edge Function
2. **Execute o SQL de verificação** e copie o resultado
3. **Verifique no Stripe Dashboard** se o Price ID realmente existe
4. **Verifique se está em modo LIVE** no Stripe Dashboard

O erro "a test mode key was used" significa que:
- A Edge Function está usando uma chave de TESTE
- Mesmo que o banco tenha chave de PRODUÇÃO
- Isso acontece quando a variável de ambiente `STRIPE_SECRET_KEY` existe com chave de teste

**Solução definitiva:** Remova a variável `STRIPE_SECRET_KEY` do Supabase para forçar o uso do banco de dados.

