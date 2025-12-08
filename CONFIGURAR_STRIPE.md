# 🔧 Configuração do Stripe

Este guia detalha como configurar o Stripe para o projeto Dr. HO SaaS usando arquivos `.env`.

## 📋 Pré-requisitos

1. Conta no Stripe (modo Test ou Live)
2. Supabase CLI instalado (`npm install -g supabase`)
3. Acesso ao dashboard do Supabase

## 🚀 Passo a Passo

### 1. Configurar Variáveis de Ambiente Local

#### 1.1. Criar arquivo `.env.local`

Crie o arquivo `.env.local` na raiz do projeto. Você pode usar o arquivo `ENV_TEMPLATE.txt` como base.

```bash
# Opção 1: Copiar o template
cp ENV_TEMPLATE.txt .env.local

# Opção 2: Criar manualmente
touch .env.local
```

#### 1.2. Preencher variáveis no `.env.local`

Abra o arquivo `.env.local` e adicione as seguintes variáveis:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51STMbT2MC0MvWzlW8pRgM9FgzMt4UgiX4l4W5HSubjQ8B3wsostyjJHFO8Vf3ACTV9fX4XQM8kiToZswlxaOET3q00CfYhrnFG
VITE_STRIPE_SECRET_KEY=sk_test_51STMbT2MC0MvWzlWPCbTHpaWqGVtZX55gyKrzTVI4wFQs60KPKwiBMTsCmhRLQI6ve6WbNmpZnciOK23HUI53rSU00nJLPp8X5
VITE_STRIPE_PRODUCT_ID=prod_TSUjx4c42eILF8
VITE_SITE_URL=http://localhost:8080
```

**Valores fornecidos:**
- `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_51STMbT2MC0MvWzlW8pRgM9FgzMt4UgiX4l4W5HSubjQ8B3wsostyjJHFO8Vf3ACTV9fX4XQM8kiToZswlxaOET3q00CfYhrnFG`
- `VITE_STRIPE_SECRET_KEY`: `sk_test_51STMbT2MC0MvWzlWPCbTHpaWqGVtZX55gyKrzTVI4wFQs60KPKwiBMTsCmhRLQI6ve6WbNmpZnciOK23HUI53rSU00nJLPp8X5`
- `VITE_STRIPE_PRODUCT_ID`: `prod_TSUjx4c42eILF8`

**Nota:** A `VITE_STRIPE_SECRET_KEY` é automaticamente passada para as Edge Functions via código. Ela não é exposta no frontend, apenas enviada nas requisições internas para as Edge Functions.

**⚠️ IMPORTANTE:**
- `VITE_STRIPE_SECRET_KEY` NÃO deve ser usado no frontend!
- A chave secreta só deve ser configurada nas Edge Functions do Supabase
- Nunca commite o arquivo `.env.local` no git

### 2. Variáveis nas Edge Functions

✅ **Não é mais necessário configurar variáveis no Supabase!**

O código agora passa automaticamente as chaves do Stripe do `.env.local` para as Edge Functions via requisições. As Edge Functions usam essas chaves quando fornecidas, com fallback para `Deno.env.get()` se necessário.

**Nota:** Apenas para webhooks do Stripe (que são chamados pelo Stripe, não pelo frontend), você ainda precisará configurar `STRIPE_WEBHOOK_SECRET` no Supabase se quiser usar webhooks. Mas isso é opcional.

### 3. Configurar Webhook do Stripe

O webhook é essencial para sincronizar o status das assinaturas.

#### 3.1. Criar Webhook no Stripe

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL do endpoint: `https://seu-project-ref.supabase.co/functions/v1/stripe-webhooks`
4. Descrição: "Dr. HO SaaS - Subscription Webhooks"

#### 3.2. Selecionar Eventos

Selecione os seguintes eventos:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### 3.3. Copiar Webhook Secret (Opcional)

**Nota:** Webhooks são opcionais. Se você quiser usar webhooks para sincronização automática:

Após criar o webhook, copie o "Signing secret" (começa com `whsec_`) e adicione nas secrets do Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
```

Ou via dashboard do Supabase: Settings > Edge Functions > Secrets

### 4. Atualizar Banco de Dados

Execute a migration para configurar o Product ID no plano:

```bash
# Via Supabase CLI
supabase db push

# Ou execute diretamente no SQL Editor do Supabase
```

O SQL está em: `supabase/migrations/20250121000000_update_stripe_product_config.sql`

Isso irá:
- Atualizar/criar o plano "Assinatura DR. HO"
- Configurar `stripe_product_id = 'prod_TSUjx4c42eILF8'`
- Definir preço de teste: R$ 1,00

### 5. Configurar Preço no Stripe (Opcional)

Você pode criar um Price no Stripe dashboard e associá-lo ao plano no banco:

1. Acesse o produto no Stripe: https://dashboard.stripe.com/products/prod_TSUjx4c42eILF8
2. Crie um Price (se ainda não existir):
   - Valor: R$ 1,00 (teste) ou R$ 999,00 (produção)
   - Intervalo: Anual (Yearly)
3. Copie o Price ID (começa com `price_`)
4. Atualize o plano no banco:

```sql
UPDATE subscription_plans
SET stripe_price_id = 'price_seu_price_id_aqui'
WHERE stripe_product_id = 'prod_TSUjx4c42eILF8';
```

**Nota:** Se você não configurar o `stripe_price_id`, o sistema criará o preço dinamicamente usando o `stripe_product_id`.

### 6. Habilitar Métodos de Pagamento no Stripe

1. Acesse: https://dashboard.stripe.com/settings/payment_methods
2. Habilite:
   - ✅ Cards (Cartões de crédito/débito)
   - ✅ Apple Pay
   - ✅ Link

**Nota:** Alguns métodos podem não estar disponíveis em todos os países. O Link pode não estar disponível no Brasil.

### 7. Deploy das Edge Functions

```bash
# Deploy de todas as Edge Functions do Stripe
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhooks
supabase functions deploy create-customer-portal
```

### 8. Testar Configuração

1. Inicie o projeto localmente:
   ```bash
   npm run dev
   ```

2. Teste o fluxo de checkout usando cartão de teste:
   - Cartão: `4242 4242 4242 4242`
   - CVC: qualquer 3 dígitos
   - Data: qualquer data futura

3. Verifique os logs:
   - Frontend: Console do navegador
   - Edge Functions: Dashboard do Supabase > Logs > Edge Functions
   - Stripe: Dashboard do Stripe > Logs > Webhooks

## 🔍 Verificação

### Checklist

- [ ] `.env.local` criado e configurado
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` configurada
- [ ] `VITE_STRIPE_SECRET_KEY` configurada
- [ ] `VITE_STRIPE_PRODUCT_ID` configurada
- [ ] `VITE_SITE_URL` configurada (opcional)
- [ ] Migration executada (plano atualizado no banco)
- [ ] Edge Functions deployadas
- [ ] Métodos de pagamento habilitados no Stripe
- [ ] Teste de checkout realizado com sucesso
- [ ] Webhook criado no Stripe (opcional)

## 🐛 Troubleshooting

### Erro: "Missing stripe-signature header"
- Verifique se o webhook está configurado corretamente
- Confirme se a URL do webhook está acessível publicamente

### Erro: "Missing STRIPE_SECRET_KEY"
- Verifique se o secret está configurado nas Edge Functions
- Confirme usando: `supabase secrets list`

### Checkout não funciona
- Verifique se `VITE_STRIPE_PUBLISHABLE_KEY` está configurada no `.env.local`
- Verifique o console do navegador para erros
- Confirme que as Edge Functions estão deployadas

### Webhook não recebe eventos
- Verifique se a URL do webhook está correta
- Confirme se os eventos estão selecionados no Stripe
- Verifique os logs das Edge Functions no Supabase

## 📝 Notas Importantes

1. **Modo Test vs Live:**
   - Use `pk_test_` e `sk_test_` para desenvolvimento
   - Use `pk_live_` e `sk_live_` para produção
   - Troque as chaves quando for para produção

2. **Product ID:**
   - O Product ID atual é: `prod_TSUjx4c42eILF8`
   - Este ID deve existir no Stripe antes de usar
   - Se mudar o Product ID, atualize no `.env.local` e no banco

3. **Preços:**
   - Preço de teste: R$ 1,00
   - Preço de produção: R$ 999,00
   - Para mudar o preço, atualize no banco ou crie novo Price no Stripe

4. **Métodos de Pagamento:**
   - Atualmente configurado: `card`, `apple_pay`, `link`
   - O Link pode não estar disponível no Brasil
   - PIX pode ser adicionado se necessário (requer configuração adicional)

## 🔒 Segurança

- **NUNCA** commite `.env.local` no git
- **NUNCA** exponha `STRIPE_SECRET_KEY` no frontend
- Use `.gitignore` para excluir arquivos `.env.local`
- Rotacione as chaves regularmente
- Use diferentes chaves para teste e produção

## 📚 Referências

- [Documentação do Stripe](https://stripe.com/docs)
- [Documentação do Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Testing](https://stripe.com/docs/testing)

