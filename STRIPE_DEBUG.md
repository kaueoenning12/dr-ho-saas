# Diagnóstico da Integração Stripe

## ✅ Status da Configuração

### Banco de Dados
```sql
SELECT id, name, price, stripe_product_id, stripe_price_id, is_active 
FROM subscription_plans 
WHERE id = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c'
```

**Resultado:**
- ✅ Nome: `DR HO - PREMIUM`
- ✅ Preço: `R$ 478.80`
- ✅ Stripe Product ID: `prod_TSWvb9EnmOlvLY`
- ✅ Stripe Price ID: `price_1SVbrGRpUByu4yV90IEbFTqe`
- ✅ Status: `Ativo`

### Variáveis de Ambiente (.env)
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_51STMbE...` (configurada)
- ✅ `VITE_STRIPE_SECRET_KEY`: `sk_test_51STMbE...` (configurada)
- ✅ `VITE_STRIPE_PRODUCT_ID`: `prod_TSWvb9EnmOlvLY` (configurado)

### Edge Function
- ✅ `create-checkout-session` configurada corretamente
- ✅ Valida planos gratuitos (bloqueia checkout)
- ✅ Valida IDs do Stripe (bloqueia se não configurados)
- ✅ Cria sessões de checkout usando `stripe_price_id`

---

## ❌ Problema Identificado

**Erro:** `CheckoutInitError: apiKey is not set`

**Onde ocorre:** Na página de checkout do Stripe (após redirecionamento)

**Causa provável:**
O produto `prod_TSWvb9EnmOlvLY` ou o preço `price_1SVbrGRpUByu4yV90IEbFTqe` **não existem** ou **estão inativos** na sua conta Stripe.

---

## 🔍 Como Verificar no Stripe Dashboard

### Passo 1: Verificar o Produto

1. **Acesse o Stripe Dashboard (Test Mode):**
   - URL: https://dashboard.stripe.com/test/products
   - **IMPORTANTE:** Certifique-se de que está em "Test Mode" (switch no topo)

2. **Pesquisar pelo Product ID:**
   - Na barra de busca, digite: `prod_TSWvb9EnmOlvLY`
   - **Se NÃO encontrar:** O produto não existe → Vá para "Solução 1"
   - **Se encontrar:** Vá para o Passo 2

### Passo 2: Verificar o Preço

1. **Clique no produto encontrado** (`prod_TSWvb9EnmOlvLY`)

2. **Na seção "Pricing", procure por:**
   - Price ID: `price_1SVbrGRpUByu4yV90IEbFTqe`
   
3. **Verificar status:**
   - ✅ O preço deve estar **ATIVO** (não arquivado)
   - ✅ Valor: `R$ 478,80` ou `BRL 478.80`
   - ✅ Tipo: `Recurring` (recorrente)
   - ✅ Período: `Yearly` (anual)

4. **Se o preço estiver arquivado ou não existir:** Vá para "Solução 2"

### Passo 3: Verificar as Chaves da API

1. **Acesse:** https://dashboard.stripe.com/test/apikeys

2. **Verifique se as chaves correspondem:**
   - Publishable key deve começar com: `pk_test_51STMbE...`
   - Secret key deve começar com: `sk_test_51STMbE...`

3. **Se forem DIFERENTES:** Você está usando chaves de outra conta → Vá para "Solução 3"

---

## 🛠️ Soluções

### Solução 1: Criar Novo Produto

Se o produto `prod_TSWvb9EnmOlvLY` NÃO existe:

1. **No Stripe Dashboard:**
   - Products → "+ Add product"
   
2. **Preencher:**
   - **Name:** `DR HO - PREMIUM`
   - **Description:** `Acesso anual completo aos relatórios do Doutor HO`
   - **Price:** `478.80`
   - **Currency:** `BRL`
   - **Billing period:** `Yearly`

3. **Anotar os NOVOS IDs:**
   - Product ID: `prod_XXXXXXXX`
   - Price ID: `price_XXXXXXXX`

4. **Me enviar os novos IDs** para que eu atualize o banco de dados

---

### Solução 2: Criar Novo Preço

Se o preço `price_1SVbrGRpUByu4yV90IEbFTqe` NÃO existe ou está arquivado:

1. **Acesse o produto:** `prod_TSWvb9EnmOlvLY`

2. **Clicar em "Add another price":**
   - **Price:** `478.80`
   - **Currency:** `BRL`
   - **Billing period:** `Yearly`
   - **Recurring:** Sim

3. **Anotar o NOVO Price ID:** `price_XXXXXXXX`

4. **Me enviar o novo Price ID** para que eu atualize o banco de dados

---

### Solução 3: Usar Chaves Corretas

Se as chaves da API não correspondem:

1. **Copiar as chaves corretas** do Stripe Dashboard
2. **Atualizar o arquivo `.env`** com as novas chaves
3. **Recarregar a aplicação** (hard refresh: Ctrl + Shift + R)

---

## 🧪 Script de Teste (Console do Navegador)

Execute este script no console do navegador para testar a conexão:

```javascript
// Teste de configuração do Stripe
const testStripeConfig = async () => {
  console.log('🔍 Testando configuração do Stripe...\n');
  
  // 1. Verificar variáveis de ambiente
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const productId = import.meta.env.VITE_STRIPE_PRODUCT_ID;
  
  console.log('📋 Variáveis de Ambiente:');
  console.log('  Publishable Key:', publishableKey ? publishableKey.substring(0, 20) + '...' : '❌ NÃO CONFIGURADA');
  console.log('  Product ID:', productId || '❌ NÃO CONFIGURADO');
  
  // 2. Testar chamada à Edge Function
  console.log('\n🚀 Testando chamada à Edge Function...');
  
  try {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    const { data: session } = await supabase.auth.getSession();
    
    if (!session?.session?.user) {
      console.error('❌ Usuário não autenticado');
      return;
    }
    
    const userId = session.session.user.id;
    console.log('  User ID:', userId);
    
    // Buscar plano Premium
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c')
      .single();
    
    if (planError) {
      console.error('❌ Erro ao buscar plano:', planError);
      return;
    }
    
    console.log('  Plano encontrado:', plan.name);
    console.log('  Stripe Product ID:', plan.stripe_product_id);
    console.log('  Stripe Price ID:', plan.stripe_price_id);
    
    // Preparar requisição
    const { prepareStripeRequest } = await import('/src/lib/stripe/edgeFunctionHelper.ts');
    const body = prepareStripeRequest({
      planId: plan.id,
      userId: userId,
      successUrl: `${window.location.origin}/plans/success`,
      cancelUrl: `${window.location.origin}/plans/cancel`,
    });
    
    console.log('\n  Requisição preparada:', {
      planId: body.planId,
      userId: body.userId,
      hasStripeKey: !!body._stripeSecretKey,
    });
    
    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: body,
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      return;
    }
    
    console.log('✅ Sessão criada com sucesso!');
    console.log('  Session ID:', data.sessionId);
    console.log('  Checkout URL:', data.url);
    
    console.log('\n🎯 PRÓXIMO PASSO:');
    console.log('  Clique no link abaixo para testar o checkout:');
    console.log('  ' + data.url);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

// Executar teste
testStripeConfig();
```

---

## 📞 Próximos Passos

1. ✅ Verificar no Stripe Dashboard se `prod_TSWvb9EnmOlvLY` existe e está ativo
2. ✅ Verificar se `price_1SVbrGRpUByu4yV90IEbFTqe` existe e está ativo
3. ✅ Se não existirem, criar novo produto/preço e me enviar os novos IDs
4. ✅ Executar o script de teste no console para diagnosticar

**Aguardando sua resposta:**
- [ ] "Produto e preço existem e estão ativos" → Vou investigar mais
- [ ] "Produto não existe" → Criar novo produto
- [ ] "Produto existe, mas preço está arquivado" → Criar novo preço
- [ ] "Novos IDs criados: prod_XXX e price_XXX" → Vou atualizar o banco

---

## 🔗 Links Úteis

- **Produtos (Test Mode):** https://dashboard.stripe.com/test/products
- **API Keys (Test Mode):** https://dashboard.stripe.com/test/apikeys
- **Logs da Edge Function:** https://supabase.com/dashboard/project/jjkptijbjyxbrgbxwgxf/functions/create-checkout-session/logs
- **Documentação Stripe:** https://docs.stripe.com/checkout/quickstart
