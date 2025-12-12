# Guia Completo: Migração Stripe para Produção

Este guia detalha todos os passos necessários para migrar a integração Stripe de modo de teste para produção.

## ⚠️ IMPORTANTE

- **NÃO execute as migrations sem ter as credenciais de produção prontas**
- **Teste primeiro em ambiente de staging se possível**
- **Faça backup do banco de dados antes de executar as migrations**
- **Mantenha a configuração de teste ativa até confirmar que produção está funcionando**

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- [ ] Conta Stripe ativada para produção
- [ ] Chaves de produção (`pk_live_...` e `sk_live_...`)
- [ ] Product ID de produção criado no Stripe
- [ ] Price ID de produção criado no Stripe
- [ ] Webhook secret de produção (`whsec_...`)
- [ ] URL de produção do seu site
- [ ] Acesso ao Supabase Dashboard
- [ ] Acesso ao Stripe Dashboard (modo Live)

---

## 🚀 Passo 1: Preparação no Stripe Dashboard

### 1.1. Ativar Conta de Produção

1. Acesse: https://dashboard.stripe.com/account
2. Complete o processo de verificação da conta
3. Aguarde aprovação do Stripe (pode levar alguns dias)

### 1.2. Criar Produto de Produção

1. Acesse: https://dashboard.stripe.com/products (modo Live)
2. Clique em "+ Add product"
3. Configure:
   - **Nome:** DR HO - PREMIUM
   - **Descrição:** Acesso completo a todos os relatórios de riscos ocupacionais
4. Clique em "Save product"
5. **Anote o Product ID** (começa com `prod_`)

### 1.3. Criar Preço de Produção

1. No produto criado, clique em "+ Add another price"
2. Configure:
   - **Pricing model:** Standard pricing
   - **Price:** R$ 478,80
   - **Billing period:** Yearly
   - **Currency:** BRL (Real brasileiro)
3. Clique em "Add price"
4. **Anote o Price ID** (começa com `price_`)

### 1.4. Configurar Webhook de Produção

1. Acesse: https://dashboard.stripe.com/webhooks (modo Live)
2. Clique em "+ Add endpoint"
3. Configure:
   - **Endpoint URL:** `https://seu-project-ref.supabase.co/functions/v1/stripe-webhooks`
     - Substitua `seu-project-ref` pelo ID do seu projeto Supabase
   - **Description:** Dr. HO SaaS - Production Webhooks
4. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique em "Add endpoint"
6. **Copie o "Signing secret"** (começa com `whsec_`)

### 1.5. Ativar Métodos de Pagamento (Opcional)

1. Acesse: https://dashboard.stripe.com/settings/payment_methods (modo Live)
2. Ative os métodos desejados:
   - **PIX:** Ativar se quiser aceitar PIX
   - **Boleto:** Ativar se quiser aceitar boleto
   - **Cartões:** Já ativado por padrão

---

## 🗄️ Passo 2: Atualizar Banco de Dados

### 2.1. Validar Configuração Atual

Antes de fazer qualquer mudança, execute o script de validação:

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: validate_stripe_production_setup.sql
```

Este script mostrará:
- Status atual das configurações
- Compatibilidade entre chaves e IDs
- Checklist de validação

### 2.2. Atualizar Configuração do Stripe

1. Abra o arquivo: `supabase/migrations/20250202000001_migrate_stripe_to_production.sql`
2. **Substitua os placeholders** pelos valores reais:
   - `pk_live_XXXXXXXXXXXXXXXXXXXXXXXX` → Sua chave pública de produção
   - `sk_live_XXXXXXXXXXXXXXXXXXXXXXXX` → Sua chave secreta de produção
   - `whsec_XXXXXXXXXXXXXXXXXXXXXXXX` → Seu webhook secret de produção
   - `prod_XXXXXXXXXXXXXXXXXXXXXXXX` → Product ID de produção (opcional)
   - `price_XXXXXXXXXXXXXXXXXXXXXXXX` → Price ID de produção (opcional)
3. Execute a migration no Supabase SQL Editor

**OU** use a interface admin:

1. Acesse a página Admin → Configurações Stripe
2. Clique em "Configurar Stripe"
3. Selecione ambiente: **Live**
4. Preencha:
   - Chave Pública: `pk_live_...`
   - Chave Secreta: `sk_live_...`
   - Webhook Secret: `whsec_...`
   - Product ID Padrão: `prod_...` (opcional)
   - Price ID Padrão: `price_...` (opcional)
5. Ative a configuração
6. **Desative a configuração de teste** (se houver)

### 2.3. Atualizar Planos com IDs de Produção

1. Abra o arquivo: `supabase/migrations/20250202000002_update_plans_to_production_ids.sql`
2. **Substitua os placeholders** pelos valores reais:
   - `prod_XXXXXXXXXXXXXXXXXXXXXXXX` → Product ID de produção
   - `price_XXXXXXXXXXXXXXXXXXXXXXXX` → Price ID de produção
3. Execute a migration no Supabase SQL Editor

**OU** use a interface admin:

1. Acesse a página Admin → Planos
2. Edite o plano "DR HO - PREMIUM"
3. Atualize:
   - Stripe Product ID: `prod_...`
   - Stripe Price ID: `price_...`
4. Salve

### 2.4. Validar Após Atualização

Execute novamente o script de validação:

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: validate_stripe_production_setup.sql
```

Verifique que:
- ✅ Apenas uma configuração está ativa (produção)
- ✅ Chaves são de produção (`pk_live_...`, `sk_live_...`)
- ✅ Price IDs estão configurados nos planos
- ✅ Compatibilidade está OK

---

## 🔧 Passo 3: Atualizar Variáveis de Ambiente

### 3.1. Atualizar `.env.local`

Abra o arquivo `.env.local` e atualize:

```env
# Stripe Configuration
# IMPORTANTE: A configuração principal está na tabela stripe_config
# Estas variáveis são apenas fallback

# Chave pública de produção
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXX

# NÃO inclua a secret key aqui!
# Ela deve estar apenas na tabela stripe_config

# Product ID (fallback apenas)
VITE_STRIPE_PRODUCT_ID=prod_XXXXXXXXXXXXXXXXXXXXXXXX

# URL de produção
VITE_SITE_URL=https://seu-dominio.com
```

### 3.2. Variáveis de Ambiente no Deploy

Se você usa Netlify, Vercel ou similar:

1. Acesse as configurações do projeto
2. Adicione/atualize as variáveis de ambiente:
   - `VITE_STRIPE_PUBLISHABLE_KEY` → Chave pública de produção
   - `VITE_SITE_URL` → URL de produção
3. **NÃO adicione** `VITE_STRIPE_SECRET_KEY` (não deve ser usada)

---

## ✅ Passo 4: Validação e Testes

### 4.1. Verificar Configuração

Execute o script de validação completo:

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: validate_stripe_production_setup.sql
```

### 4.2. Testar Checkout

1. Acesse a página `/plans` em produção
2. Clique em "Assinar Agora"
3. Verifique que:
   - Redireciona para o Stripe Checkout
   - Produto exibido está correto
   - Preço está correto (R$ 478,80/ano)
   - Não há erros no console

### 4.3. Testar Pagamento Real

⚠️ **ATENÇÃO:** Este será um pagamento real!

1. Complete o checkout com um cartão real
2. Verifique que:
   - Pagamento é processado
   - Redireciona para `/plans/success`
   - Assinatura é criada no banco de dados
   - Email de confirmação é enviado

### 4.4. Verificar Webhooks

1. Acesse: https://dashboard.stripe.com/webhooks (modo Live)
2. Clique no webhook configurado
3. Verifique os eventos recebidos:
   - `checkout.session.completed` deve aparecer
   - Status deve ser "Succeeded"
4. Verifique os logs da Edge Function no Supabase

### 4.5. Verificar Logs

1. Acesse: Supabase Dashboard → Edge Functions → `create-checkout-session` → Logs
2. Verifique que:
   - Chave usada é de produção (`sk_live_...`)
   - Price ID usado é de produção
   - Não há erros de compatibilidade

---

## 🔄 Passo 5: Rollback (Se Necessário)

Se algo der errado, você pode reverter:

### 5.1. Reativar Configuração de Teste

```sql
-- Desativar produção
UPDATE stripe_config
SET is_active = false
WHERE environment = 'live';

-- Reativar teste
UPDATE stripe_config
SET is_active = true
WHERE environment = 'test';
```

### 5.2. Reverter IDs dos Planos

Execute a migration de teste novamente ou atualize manualmente via interface admin.

---

## 📊 Checklist Final

Antes de considerar a migração completa:

- [ ] Conta Stripe de produção ativada
- [ ] Product ID de produção criado
- [ ] Price ID de produção criado
- [ ] Webhook de produção configurado
- [ ] Webhook secret obtido
- [ ] Configuração de teste desativada
- [ ] Configuração de produção criada e ativada
- [ ] Planos atualizados com IDs de produção
- [ ] Variáveis de ambiente atualizadas
- [ ] Script de validação executado sem erros
- [ ] Checkout testado em produção
- [ ] Pagamento real testado
- [ ] Webhooks funcionando
- [ ] Logs verificados
- [ ] Documentação atualizada

---

## 🆘 Troubleshooting

### Erro: "Incompatibilidade entre chave e Price ID"

**Causa:** A chave secreta é de produção, mas o Price ID é de teste (ou vice-versa).

**Solução:**
1. Verifique que o Price ID no banco é de produção
2. Verifique que a chave secreta na `stripe_config` é de produção
3. Execute o script de validação

### Erro: "Price ID não encontrado no Stripe"

**Causa:** O Price ID não existe ou está no ambiente errado.

**Solução:**
1. Verifique no Stripe Dashboard (modo Live) se o Price ID existe
2. Verifique se o Price ID está correto no banco de dados
3. Certifique-se de estar no modo correto do Stripe Dashboard

### Webhook não está recebendo eventos

**Causa:** Webhook não configurado ou URL incorreta.

**Solução:**
1. Verifique a URL do webhook no Stripe Dashboard
2. Verifique se o webhook secret está configurado na `stripe_config`
3. Teste o webhook usando o Stripe CLI ou o botão "Send test webhook"

### Checkout não funciona

**Causa:** Chave pública incorreta ou não carregada.

**Solução:**
1. Verifique que `VITE_STRIPE_PUBLISHABLE_KEY` está configurada
2. Verifique que a configuração ativa na `stripe_config` tem `publishable_key` correto
3. Faça hard refresh da página (`Ctrl + F5`)

---

## 📚 Arquivos Relacionados

- `supabase/migrations/20250202000001_migrate_stripe_to_production.sql` - Migration de configuração
- `supabase/migrations/20250202000002_update_plans_to_production_ids.sql` - Migration de planos
- `validate_stripe_production_setup.sql` - Script de validação
- `STRIPE_CREDENTIALS.md` - Documentação de credenciais
- `ENV_TEMPLATE.txt` - Template de variáveis de ambiente

---

## 🔗 Links Úteis

- [Stripe Dashboard (Live)](https://dashboard.stripe.com/dashboard)
- [Stripe Products (Live)](https://dashboard.stripe.com/products)
- [Stripe Webhooks (Live)](https://dashboard.stripe.com/webhooks)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Documentação Stripe](https://stripe.com/docs)

---

## 📞 Suporte

Em caso de dúvidas:
1. Verifique os logs da Edge Function
2. Verifique o console do navegador
3. Execute o script de validação
4. Consulte a documentação do Stripe



