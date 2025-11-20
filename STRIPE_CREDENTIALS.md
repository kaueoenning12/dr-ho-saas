# Credenciais Stripe - Modo Teste

**Última atualização:** 2024-11-20

## Credenciais Atuais (Modo Teste)

- **Chave Pública:** `pk_test_51STMbERpUByu4yV90CWF3VrHIkIb4ScKLXeapOVbkELDmHC1gGZGBg9OUdLF86Vz3NAfYfkspILIRFazoleN9Yxi00eybx98Xc`
- **Chave Secreta:** `sk_test_51STMbERpUByu4yV9TtZl6lTugyByVyVg6iHSgYuEOEHNkiKwlsQcA1fcBNtSyd7OVgwMJ3H3KFfRFJp2RX8iUDna00XjPz7iJ8`
- **Product ID:** `prod_TSWvb9EnmOlvLY`
- **Price ID:** `price_1SVbrGRpUByu4yV90IEbFTqe`

## Plano Configurado

- **Nome:** DR HO - PREMIUM
- **Preço:** R$ 478,80/ano
- **Parcelamento:** 12x R$ 39,90
- **ID no Banco:** `cb2078ac-1741-4a7b-afc1-48cbf05efd5c`

## Configurações Implementadas

### 1. Variáveis de Ambiente (`.env`)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51STMbERpUByu4yV90CWF3VrHIkIb4ScKLXeapOVbkELDmHC1gGZGBg9OUdLF86Vz3NAfYfkspILIRFazoleN9Yxi00eybx98Xc
VITE_STRIPE_SECRET_KEY=sk_test_51STMbERpUByu4yV9TtZl6lTugyByVyVg6iHSgYuEOEHNkiKwlsQcA1fcBNtSyd7OVgwMJ3H3KFfRFJp2RX8iUDna00XjPz7iJ8
VITE_STRIPE_PRODUCT_ID=prod_TSWvb9EnmOlvLY
```

### 2. Supabase Secrets
- `STRIPE_SECRET_KEY` - Configurado para uso nas Edge Functions

### 3. Banco de Dados
- Tabela `subscription_plans` atualizada com novos IDs do Stripe
- Migration executada: `20251120174531_aae87647-8cf9-4262-a1e2-f92a1af58b6a.sql`

## Como Testar

### 1. Verificar Configuração
1. Acesse `/plans` na aplicação
2. Verifique se exibe "DR HO - PREMIUM - R$ 478,80 por ano"
3. Abra o Console do navegador (F12)
4. Procure por logs do tipo `[Stripe Helper]`

### 2. Testar Checkout
1. Clique no botão "Assinar Agora"
2. Deve redirecionar para o Stripe Checkout
3. Verifique se carrega sem erro `apiKey is not set`
4. Produto exibido deve ser "DR HO - PREMIUM"
5. Preço deve ser R$ 478,80/ano

### 3. Pagamento de Teste
Use os dados de teste do Stripe:
- **Cartão:** `4242 4242 4242 4242`
- **Data de expiração:** qualquer data futura (ex: 12/25)
- **CVV:** qualquer 3 dígitos (ex: 123)
- **Nome:** qualquer nome
- **CEP:** qualquer CEP válido (ex: 01310-100)

Após o pagamento:
- Deve redirecionar para `/plans/success`
- Assinatura deve ser criada no banco de dados

### 4. Verificar Edge Function Logs
1. Acesse: [Edge Function Logs](https://supabase.com/dashboard/project/jjkptijbjyxbrgbxwgxf/functions/create-checkout-session/logs)
2. Procure por logs da sessão de checkout
3. Verifique se mostra os IDs corretos:
   - `stripe_product_id: prod_TSWvb9EnmOlvLY`
   - `stripe_price_id: price_1SVbrGRpUByu4yV90IEbFTqe`

## Troubleshooting

### Erro: `apiKey is not set`
**Causa:** Chaves não estão sendo carregadas corretamente

**Solução:**
1. Verifique o arquivo `.env` - confirme que as chaves estão corretas
2. Faça um hard refresh da aplicação (`Ctrl + F5`)
3. Verifique os logs do console para confirmar que as chaves estão sendo lidas

### Erro: Produto não encontrado no Stripe
**Causa:** Product ID ou Price ID incorretos

**Solução:**
1. Verifique no [Stripe Dashboard](https://dashboard.stripe.com/test/products) se o produto `prod_TSWvb9EnmOlvLY` existe
2. Verifique se o preço `price_1SVbrGRpUByu4yV90IEbFTqe` está ativo
3. Confirme que o plano no banco tem os IDs corretos:
```sql
SELECT stripe_product_id, stripe_price_id 
FROM subscription_plans 
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';
```

### Pagamento não atualiza assinatura
**Causa:** Webhook não configurado

**Solução:**
1. Configure o webhook no Stripe Dashboard:
   - URL: `https://jjkptijbjyxbrgbxwgxf.supabase.co/functions/v1/stripe-webhooks`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
2. Adicione o webhook secret no Supabase como `STRIPE_WEBHOOK_SECRET`

## Próximos Passos para Produção

### 1. Ativar Conta Stripe
- Enviar documentos necessários
- Aguardar aprovação do Stripe
- Ativar conta de produção

### 2. Criar Produto de Produção
- Criar novo produto no Stripe em modo produção
- Criar preço de R$ 478,80/ano
- Anotar novos Product ID e Price ID

### 3. Atualizar Credenciais
- Obter chaves de produção: `pk_live_...` e `sk_live_...`
- Atualizar `.env` com chaves de produção
- Atualizar secret `STRIPE_SECRET_KEY` no Supabase
- Executar migration para atualizar IDs no banco

### 4. Configurar Webhook de Produção
- Configurar webhook apontando para a URL de produção
- Adicionar `STRIPE_WEBHOOK_SECRET` de produção no Supabase

### 5. Ativar Métodos de Pagamento Adicionais
- **PIX:** Ativar no Stripe Dashboard → Settings → Payment methods
- **Boleto:** Ativar no Stripe Dashboard → Settings → Payment methods
- **Stripe Link:** Já ativado automaticamente com cartões

### 6. Testes de Produção
- Realizar pagamento real de teste
- Verificar recebimento do pagamento no Stripe
- Confirmar atualização de assinatura no banco
- Testar cancelamento e renovação

## Arquivos Relacionados

### Frontend
- `src/lib/stripe/config.ts` - Configuração do Stripe
- `src/lib/stripe/client.ts` - Cliente Stripe
- `src/lib/stripe/edgeFunctionHelper.ts` - Helper para Edge Functions
- `src/pages/Plans.tsx` - Página de planos

### Backend
- `supabase/functions/create-checkout-session/index.ts` - Criar sessão de checkout
- `supabase/functions/stripe-webhooks/index.ts` - Processar eventos do Stripe

### Database
- Tabela: `subscription_plans` - Planos de assinatura
- Tabela: `user_subscriptions` - Assinaturas dos usuários

## Links Úteis

- [Stripe Dashboard (Test)](https://dashboard.stripe.com/test/dashboard)
- [Stripe Products](https://dashboard.stripe.com/test/products)
- [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
- [Supabase Edge Functions](https://supabase.com/dashboard/project/jjkptijbjyxbrgbxwgxf/functions)
- [Edge Function Logs](https://supabase.com/dashboard/project/jjkptijbjyxbrgbxwgxf/functions/create-checkout-session/logs)
- [Stripe Testing Cards](https://stripe.com/docs/testing#cards)

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs da Edge Function
2. Verifique o console do navegador
3. Consulte a documentação do Stripe: https://stripe.com/docs
4. Verifique o status do webhook no Stripe Dashboard
