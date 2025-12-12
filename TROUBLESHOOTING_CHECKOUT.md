# Troubleshooting: Erro no Checkout do Stripe

## Erro: "Erro interno do servidor ao processar checkout"

Este erro genérico pode ter várias causas. Siga este guia para identificar e resolver o problema.

---

## 🔍 Passo 1: Executar Diagnóstico

Execute o script SQL de diagnóstico:

```sql
-- Arquivo: diagnose_stripe_checkout_error.sql
```

Este script verificará:
- ✅ Configuração ativa do Stripe
- ✅ Múltiplas configurações ativas
- ✅ IDs configurados no plano
- ✅ Compatibilidade entre chave e Price ID
- ✅ Formato dos IDs

---

## 🔧 Passo 2: Verificar Logs da Edge Function

1. Acesse: Supabase Dashboard → Edge Functions → `create-checkout-session` → Logs
2. Procure por erros recentes
3. Verifique mensagens que começam com:
   - `[Checkout Session] ❌`
   - `[Checkout Session] ⚠️`

### Erros Comuns nos Logs

#### "Price ID não encontrado no Stripe"
**Causa:** O Price ID configurado não existe no Stripe ou está no ambiente errado.

**Solução:**
1. Verifique no Stripe Dashboard se o Price ID existe
2. Certifique-se de estar no modo correto (Test/Live)
3. Verifique se o Price ID no banco está correto

#### "Incompatibilidade entre chave e Price ID"
**Causa:** A chave secreta é de produção, mas o Price ID é de teste (ou vice-versa).

**Solução:**
1. Execute o script de diagnóstico
2. Verifique a compatibilidade
3. Atualize o Price ID ou a chave para o mesmo ambiente

#### "Stripe secret key not configured"
**Causa:** Nenhuma chave secreta configurada na tabela `stripe_config`.

**Solução:**
1. Acesse Admin → Configurações Stripe
2. Crie/edite a configuração
3. Preencha a chave secreta
4. Ative a configuração

#### "Plano não configurado no Stripe"
**Causa:** O plano não tem `stripe_price_id` configurado.

**Solução:**
1. Acesse Admin → Planos
2. Edite o plano "DR HO - PREMIUM"
3. Configure o `stripe_price_id`
4. Salve

---

## 🔍 Passo 3: Verificar Console do Navegador

1. Abra o Console do navegador (F12)
2. Procure por erros que começam com:
   - `[Stripe Helper]`
   - `[Stripe Config]`
   - `Subscription error`

### Erros Comuns no Console

#### "Chave publishable não configurada"
**Causa:** `VITE_STRIPE_PUBLISHABLE_KEY` não está configurada ou a configuração ativa não tem `publishable_key`.

**Solução:**
1. Verifique `.env.local` (fallback)
2. Verifique a configuração ativa na tabela `stripe_config`
3. Certifique-se de que `publishable_key` está preenchido

#### "Edge Function returned a non-2xx status code"
**Causa:** A Edge Function retornou um erro (500, 400, etc.).

**Solução:**
1. Verifique os logs da Edge Function (Passo 2)
2. Expanda o objeto `details` no console para ver mais informações
3. Procure por `stripeErrorCode` ou `stripeErrorType`

---

## 🔧 Passo 4: Verificar Configuração no Banco

### 4.1. Verificar Configuração Ativa

```sql
SELECT 
  id,
  environment,
  is_active,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key,
  CASE 
    WHEN webhook_secret IS NOT NULL THEN 'Configurado'
    ELSE 'Não configurado'
  END as webhook_status
FROM stripe_config
WHERE is_active = true;
```

**O que verificar:**
- ✅ Apenas uma configuração deve estar ativa
- ✅ `publishable_key` deve estar preenchido
- ✅ `secret_key` deve estar preenchido
- ✅ Formato das chaves deve estar correto (`pk_test_...` ou `pk_live_...`)

### 4.2. Verificar Plano

```sql
SELECT 
  id,
  name,
  stripe_product_id,
  stripe_price_id,
  is_active
FROM subscription_plans
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';
```

**O que verificar:**
- ✅ `stripe_price_id` deve estar preenchido
- ✅ `stripe_price_id` deve começar com `price_`
- ✅ Não deve ter espaços no início/fim

### 4.3. Verificar Compatibilidade

```sql
SELECT 
  sc.environment,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    WHEN sc.secret_key LIKE 'sk_test_%' THEN 'TESTE'
    ELSE 'INVÁLIDO'
  END as tipo_chave,
  sp.stripe_price_id,
  LENGTH(sp.stripe_price_id) as price_id_length,
  CASE 
    WHEN sc.secret_key LIKE 'sk_live_%' AND LENGTH(sp.stripe_price_id) >= 30 THEN '✅ COMPATÍVEL'
    WHEN sc.secret_key LIKE 'sk_test_%' AND LENGTH(sp.stripe_price_id) < 30 THEN '✅ COMPATÍVEL'
    ELSE '❌ INCOMPATÍVEL'
  END as status
FROM stripe_config sc
CROSS JOIN subscription_plans sp
WHERE sc.is_active = true 
  AND sp.id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';
```

---

## 🔧 Passo 5: Soluções por Tipo de Erro

### Erro 500 (Erro Interno)

1. **Verificar logs da Edge Function**
   - Procure por stack traces
   - Verifique se há erros de conexão com o Stripe
   - Verifique se há erros de banco de dados

2. **Verificar se o Price ID existe no Stripe**
   - Acesse Stripe Dashboard
   - Procure pelo Price ID
   - Verifique se está ativo

3. **Verificar se a chave secreta está correta**
   - Teste a chave no Stripe Dashboard
   - Verifique se não expirou
   - Verifique se está no ambiente correto

### Erro 400 (Bad Request)

1. **Verificar formato dos IDs**
   - Price ID deve começar com `price_`
   - Product ID deve começar com `prod_`
   - Não deve ter espaços

2. **Verificar se os campos obrigatórios estão preenchidos**
   - `planId` deve ser enviado
   - `userId` deve ser enviado
   - Plano deve existir e estar ativo

### Erro de Rede

1. **Verificar conexão com Supabase**
   - Teste outras funcionalidades
   - Verifique se o Supabase está online

2. **Verificar CORS**
   - Verifique se o domínio está permitido
   - Verifique os headers da requisição

---

## 📋 Checklist de Verificação

Antes de reportar o problema, verifique:

- [ ] Script de diagnóstico executado
- [ ] Logs da Edge Function verificados
- [ ] Console do navegador verificado
- [ ] Configuração ativa verificada no banco
- [ ] Plano verificado no banco
- [ ] Compatibilidade verificada
- [ ] Price ID existe no Stripe Dashboard
- [ ] Chave secreta está correta
- [ ] Webhook secret configurado (se usando webhooks)

---

## 🆘 Se Nada Funcionar

1. **Coletar informações:**
   - Screenshot do erro no console
   - Logs da Edge Function
   - Resultado do script de diagnóstico
   - URL da página onde ocorre o erro

2. **Verificar se é problema temporário:**
   - Tente novamente após alguns minutos
   - Verifique o status do Stripe: https://status.stripe.com/
   - Verifique o status do Supabase

3. **Contatar suporte:**
   - Forneça todas as informações coletadas
   - Inclua o timestamp do erro
   - Descreva o que estava fazendo quando o erro ocorreu

---

## 🔗 Links Úteis

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Stripe Status](https://status.stripe.com/)
- [Documentação Stripe](https://stripe.com/docs)

---

## 📝 Notas

- Sempre verifique os logs da Edge Function primeiro
- O erro genérico geralmente indica um problema na Edge Function
- Expanda o objeto `details` no console para ver mais informações
- Use o script de diagnóstico para identificar problemas de configuração



