# 🔑 Onde Estão as Chaves API do Stripe no Código

Este documento lista todos os locais onde as chaves API do Stripe estão configuradas ou referenciadas no código.

## 📍 Locais Principais de Configuração

### 1. **Banco de Dados - Tabela `stripe_config`** (FONTE PRINCIPAL)

**Localização:** Supabase Database → Tabela `stripe_config`

**Campos:**
- `secret_key` - Chave secreta do Stripe (sk_test_... ou sk_live_...)
- `publishable_key` - Chave pública do Stripe (pk_test_... ou pk_live_...)
- `webhook_secret` - Secret do webhook (whsec_...)
- `environment` - Ambiente: 'test' ou 'live'
- `is_active` - Se a configuração está ativa (apenas uma deve estar ativa)

**Como é usada:**
- As Edge Functions buscam a configuração ativa (`is_active = true`) desta tabela
- O frontend busca a `publishable_key` desta tabela (com fallback para .env)

**Arquivos que usam:**
- `supabase/functions/create-checkout-session/index.ts` (linhas 174-259)
- `supabase/functions/stripe-webhooks/index.ts` (linhas 28-51)
- `supabase/functions/create-customer-portal/index.ts` (linhas 27-47)
- `supabase/functions/update-subscription-plan/index.ts` (linhas 43-63)
- `src/lib/stripe/config.ts` (função `getStripePublishableKey()`)
- `src/hooks/useStripeConfig.ts` (hooks React Query)

---

### 2. **Variáveis de Ambiente (.env.local)** (FALLBACK)

**Localização:** Arquivo `.env.local` na raiz do projeto (não versionado)

**Variáveis:**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... ou pk_live_...
VITE_STRIPE_SECRET_KEY=sk_test_... ou sk_live_... (NÃO RECOMENDADO)
VITE_STRIPE_PRODUCT_ID=prod_... (fallback apenas)
VITE_SITE_URL=http://localhost:8080 ou https://seu-dominio.com
```

**Como é usada:**
- **Frontend:** `VITE_STRIPE_PUBLISHABLE_KEY` é usado como fallback se não houver configuração no banco
- **Edge Functions:** `STRIPE_SECRET_KEY` (Deno.env) é usado como fallback se não houver configuração no banco
- **⚠️ IMPORTANTE:** A secret key NÃO deve ser passada do frontend para as Edge Functions

**Arquivos que usam:**
- `src/lib/stripe/config.ts` (linha 4) - `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`
- `src/lib/stripe/edgeFunctionHelper.ts` (linha 8) - `import.meta.env.VITE_STRIPE_SECRET_KEY` (apenas para referência, não enviada)
- `supabase/functions/create-checkout-session/index.ts` (linha 227) - `Deno.env.get('STRIPE_SECRET_KEY')` (fallback)
- `supabase/functions/stripe-webhooks/index.ts` (linha 41) - `Deno.env.get('STRIPE_SECRET_KEY')` (fallback)
- `supabase/functions/create-customer-portal/index.ts` (linha 39) - `Deno.env.get('STRIPE_SECRET_KEY')` (fallback)
- `supabase/functions/update-subscription-plan/index.ts` (linha 55) - `Deno.env.get('STRIPE_SECRET_KEY')` (fallback)

---

### 3. **Documentação (Apenas Referência)**

**Arquivos com chaves documentadas:**
- `STRIPE_CREDENTIALS.md` - Contém chaves de teste
- `ENV_TEMPLATE.txt` - Template com exemplos
- `CONFIGURAR_STRIPE.md` - Instruções de configuração
- `README.md` - Documentação principal

**⚠️ NOTA:** Esses arquivos contêm chaves de exemplo/teste e devem ser atualizados quando migrar para produção.

---

## 🔄 Fluxo de Busca das Chaves

### Frontend (Publishable Key)
```
1. Busca na tabela stripe_config (is_active = true) → publishable_key
2. Se não encontrar, usa fallback: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
```

### Edge Functions (Secret Key)
```
1. Busca na tabela stripe_config (is_active = true) → secret_key
2. Se não encontrar, usa fallback: Deno.env.get('STRIPE_SECRET_KEY')
3. ⚠️ NÃO usa chave do request body (removido por segurança)
```

---

## 🐛 Problema Atual Identificado

**Erro:** `No such price: 'price_1SdFEiRpUByu4yV9NB4rlLe6'; a similar object exists in live mode, but a test mode key was used to make this request.`

**Causa:** Incompatibilidade entre:
- **Chave secreta:** Modo TESTE (sk_test_...)
- **Price ID:** Modo PRODUÇÃO (price_1SdFEiRpUByu4yV9NB4rlLe6 - ID longo, indica produção)

**Onde verificar:**
1. Execute o script `verificar_chaves_stripe.sql` no Supabase SQL Editor
2. Verifique a tabela `stripe_config` - qual configuração está ativa?
3. Verifique a tabela `subscription_plans` - qual Price ID está configurado?

---

## ✅ Como Resolver o Problema

### Opção 1: Usar Chaves de Produção (Recomendado para produção)
```sql
-- Atualizar stripe_config com chaves de produção
UPDATE stripe_config
SET 
  secret_key = 'sk_live_XXXXXXXXXXXXXXXXXXXXXXXX',
  publishable_key = 'pk_live_XXXXXXXXXXXXXXXXXXXXXXXX',
  environment = 'live',
  is_active = true
WHERE environment = 'live';

-- Desativar configuração de teste
UPDATE stripe_config
SET is_active = false
WHERE environment = 'test';
```

### Opção 2: Usar Price ID de Teste (Para desenvolvimento)
```sql
-- Criar um Price ID de teste no Stripe Dashboard primeiro
-- Depois atualizar o plano:
UPDATE subscription_plans
SET stripe_price_id = 'price_XXXXXXXXXXXXXX' -- Price ID de teste (curto)
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';
```

---

## 🔍 Scripts de Diagnóstico

1. **`verificar_chaves_stripe.sql`** - Verifica todas as configurações e detecta incompatibilidades
2. **`check_stripe_environment_mismatch.sql`** - Verifica especificamente incompatibilidades de ambiente
3. **`diagnose_stripe_checkout_error.sql`** - Diagnóstico completo de erros de checkout

Execute esses scripts no Supabase SQL Editor para diagnosticar problemas.

---

## 📝 Checklist de Verificação

- [ ] Verificar qual configuração está ativa na tabela `stripe_config`
- [ ] Verificar se a chave secreta e publishable key são do mesmo ambiente (test/live)
- [ ] Verificar se o Price ID no plano é compatível com a chave (test com test, live com live)
- [ ] Verificar se apenas uma configuração está ativa (`is_active = true`)
- [ ] Verificar se as chaves existem no Stripe Dashboard no ambiente correto
- [ ] Verificar se o Price ID existe no Stripe Dashboard no ambiente correto

---

## 🔐 Segurança

- ✅ **Secret Key NUNCA é exposta no frontend**
- ✅ **Secret Key é buscada apenas nas Edge Functions (backend)**
- ✅ **Publishable Key pode ser exposta no frontend (é pública)**
- ✅ **Configuração principal está no banco de dados (stripe_config)**
- ✅ **Variáveis de ambiente são apenas fallback**

---

## 📚 Referências

- [Stripe API Keys Documentation](https://stripe.com/docs/keys)
- [Stripe Test vs Live Mode](https://stripe.com/docs/keys#test-live-modes)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)


