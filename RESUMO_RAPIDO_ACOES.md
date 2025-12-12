# ⚡ Resumo Rápido: Ações Necessárias

## 🎯 Problema Principal

A Edge Function está usando uma **chave de TESTE** mesmo com chave de PRODUÇÃO no banco. Isso acontece porque a **variável de ambiente `STRIPE_SECRET_KEY` no Supabase** está sobrescrevendo o banco de dados.

## ✅ Ações Imediatas (Faça Agora)

### 1️⃣ **REMOVER Variável de Ambiente no Supabase** (CRÍTICO)

1. Acesse: https://supabase.com/dashboard
2. Seu projeto → **Project Settings** → **Edge Functions** → **Secrets**
3. **DELETE** a variável `STRIPE_SECRET_KEY` (se existir)
4. Isso força a Edge Function a usar apenas o banco de dados

### 2️⃣ **Verificar Configuração no Banco**

Execute no **Supabase SQL Editor**:

```sql
-- Ver configuração ativa
SELECT 
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_live_%' THEN '✅ PRODUÇÃO'
    WHEN secret_key LIKE 'sk_test_%' THEN '❌ TESTE'
    ELSE '⚠️ DESCONHECIDO'
  END as tipo_chave,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview
FROM stripe_config
WHERE is_active = true;
```

**Deve mostrar:**
- ✅ `environment = 'live'`
- ✅ `tipo_chave = '✅ PRODUÇÃO'`
- ✅ `secret_key_preview` começa com `sk_live_...`

### 3️⃣ **Verificar Price ID no Stripe Dashboard**

1. Acesse: https://dashboard.stripe.com/products
2. **Certifique-se de estar em modo LIVE** (não Test mode)
3. Procure pelo produto: `prod_TaQ4Kguvqz2YaS`
4. Verifique se o Price ID `price_1SdFEiRpUByu4yV9NB4rlLe6` existe e está **ATIVO**

**Se não existir:**
- Crie um novo Price no produto
- Anote o novo Price ID
- Atualize no banco:

```sql
UPDATE subscription_plans
SET stripe_price_id = 'NOVO_PRICE_ID_AQUI'
WHERE id = '0d2a8f57-1e9f-4126-8195-de07800085e9';
```

### 4️⃣ **Verificar Logs da Edge Function**

1. Supabase Dashboard → **Edge Functions** → **create-checkout-session** → **Logs**
2. Procure por: `🔧 CHAVE FINAL QUE SERÁ USADA:`
3. Verifique:
   - `secretKeySource` deve ser `'Banco de Dados (stripe_config)'`
   - `secretKeyType` deve ser `'PRODUCTION'`

## 📋 Checklist Rápido

- [ ] Variável `STRIPE_SECRET_KEY` **REMOVIDA** do Supabase
- [ ] Banco tem configuração ativa com chave de PRODUÇÃO
- [ ] Price ID existe no Stripe Dashboard (modo LIVE)
- [ ] Price ID está ATIVO (não arquivado)
- [ ] Logs da Edge Function mostram uso do banco (não fallback)

## 🔍 Script SQL Completo

Execute `verificar_tudo_stripe.sql` no Supabase SQL Editor para verificação completa.

## 📖 Guia Completo

Consulte `GUIA_COMPLETO_VERIFICACAO_STRIPE.md` para instruções detalhadas.

---

**⚠️ IMPORTANTE:** A variável de ambiente no Supabase tem prioridade sobre o banco. Remova-a para garantir que o banco seja usado.

