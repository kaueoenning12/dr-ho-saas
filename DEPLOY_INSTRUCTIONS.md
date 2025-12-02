# Instruções de Deploy - Atualização de Subscription Plan

Este documento contém instruções passo-a-passo para configurar e fazer deploy das funcionalidades de atualização de subscription plan após checkout do Stripe.

## Problemas Comuns

Se você está vendo erros como:
- `CORS policy: Response to preflight request doesn't pass access control check`
- `Could not find the function public.update_user_subscription_plan(p_plan_id) in the schema cache`
- `plan_id` não está sendo atualizado para premium após checkout

Siga as instruções abaixo para resolver.

## Pré-requisitos

- Acesso ao Supabase Dashboard
- Supabase CLI instalado (opcional, mas recomendado)
- Acesso ao terminal/command line

## Passo 1: Executar Migration da RPC Function

A migration cria a função RPC `update_user_subscription_plan` e a RLS policy necessária.

### Opção A: Via Supabase CLI (Recomendado)

1. Abra o terminal na raiz do projeto
2. Certifique-se de estar conectado ao Supabase:
   ```bash
   supabase login
   ```
3. Link o projeto (se ainda não estiver linkado):
   ```bash
   supabase link --project-ref seu-project-ref
   ```
4. Execute a migration:
   ```bash
   supabase db push
   ```
   Ou execute apenas a migration específica:
   ```bash
   supabase migration up
   ```

### Opção B: Via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Abra o arquivo `supabase/migrations/20250125000000_add_update_subscription_plan_rpc.sql`
6. Copie todo o conteúdo do arquivo
7. Cole no SQL Editor
8. Clique em **Run** (ou pressione `Ctrl+Enter` / `Cmd+Enter`)

### Verificar se a Migration Foi Executada

Execute o script de verificação:

1. No Supabase Dashboard, vá para **SQL Editor**
2. Abra o arquivo `scripts/verify-setup.sql`
3. Copie e cole o conteúdo no SQL Editor
4. Execute o script
5. Verifique se todos os itens mostram ✅

## Passo 2: Deploy da Edge Function

A Edge Function `update-subscription-plan` precisa ser deployada com a correção de CORS.

### Via Supabase CLI

1. Certifique-se de estar na raiz do projeto
2. Faça login (se necessário):
   ```bash
   supabase login
   ```
3. Link o projeto (se necessário):
   ```bash
   supabase link --project-ref seu-project-ref
   ```
4. Deploy da função:
   ```bash
   supabase functions deploy update-subscription-plan
   ```

### Verificar se o Deploy Foi Bem-Sucedido

1. No Supabase Dashboard, vá para **Edge Functions**
2. Procure por `update-subscription-plan`
3. Verifique se está listada e ativa
4. Clique na função para ver os logs

## Passo 3: Verificar Configuração

### Verificar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no Supabase:

1. No Dashboard, vá para **Project Settings** > **Edge Functions** > **Secrets**
2. Verifique se existem:
   - `STRIPE_SECRET_KEY` - Chave secreta do Stripe
   - `STRIPE_WEBHOOK_SECRET` - Secret do webhook do Stripe (opcional, mas recomendado)
   - `SUPABASE_URL` - URL do seu projeto (geralmente já configurado)
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (geralmente já configurado)

### Verificar RLS Policies

Execute o script de verificação (`scripts/verify-setup.sql`) para confirmar que:
- ✅ RPC function existe
- ✅ RLS policy "Users can update their own subscription" existe
- ✅ Permissão GRANT para authenticated existe
- ✅ RLS está habilitado

## Passo 4: Testar o Fluxo Completo

1. **Fazer uma assinatura de teste:**
   - Acesse a página de planos
   - Clique em "Assinar" no plano premium
   - Complete o checkout do Stripe (use cartão de teste: `4242 4242 4242 4242`)

2. **Verificar logs no console do navegador:**
   - Abra o DevTools (F12)
   - Vá para a aba Console
   - Procure por logs que começam com `[Success]`
   - Verifique se não há erros de CORS ou 404

3. **Verificar no banco de dados:**
   - No Supabase Dashboard, vá para **Table Editor**
   - Abra a tabela `user_subscriptions`
   - Verifique se o `plan_id` foi atualizado para `cb2078ac-1741-4a7b-afc1-48cbf05efd5c`

## Troubleshooting

### Erro: "CORS policy: Response to preflight request doesn't pass access control check"

**Causa:** A Edge Function não foi redeployada após a correção de CORS.

**Solução:**
1. Certifique-se de que o arquivo `supabase/functions/update-subscription-plan/index.ts` tem:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { 
       status: 204,
       headers: corsHeaders 
     })
   }
   ```
2. Faça o deploy novamente:
   ```bash
   supabase functions deploy update-subscription-plan
   ```

### Erro: "Could not find the function public.update_user_subscription_plan"

**Causa:** A migration não foi executada.

**Solução:**
1. Execute a migration seguindo o **Passo 1** acima
2. Verifique usando o script `scripts/verify-setup.sql`

### Erro: "permission denied" ao tentar atualizar subscription

**Causa:** A RLS policy não está configurada corretamente.

**Solução:**
1. Execute a migration novamente (ela cria a policy)
2. Verifique usando o script de verificação
3. Se necessário, execute manualmente:
   ```sql
   CREATE POLICY "Users can update their own subscription"
     ON public.user_subscriptions
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   ```

### O `plan_id` não está sendo atualizado

**Possíveis causas:**
1. Webhook do Stripe não está configurado
2. Edge Function não está sendo chamada
3. RPC function não existe ou não tem permissão

**Solução:**
1. Verifique os logs da Edge Function no Dashboard
2. Verifique os logs do webhook do Stripe
3. Execute o script de verificação
4. Verifique os logs no console do navegador

## Ordem de Execução Recomendada

1. ✅ Executar migration da RPC function
2. ✅ Verificar migration com script de verificação
3. ✅ Deploy da Edge Function
4. ✅ Verificar variáveis de ambiente
5. ✅ Testar fluxo completo
6. ✅ Verificar logs e banco de dados

## Suporte

Se após seguir todas as instruções o problema persistir:

1. Execute o script `scripts/verify-setup.sql` e compartilhe os resultados
2. Verifique os logs da Edge Function no Dashboard
3. Verifique os logs no console do navegador
4. Verifique os logs do webhook do Stripe (se configurado)

## Arquivos Importantes

- `supabase/migrations/20250125000000_add_update_subscription_plan_rpc.sql` - Migration da RPC function
- `supabase/functions/update-subscription-plan/index.ts` - Edge Function
- `src/pages/plans/Success.tsx` - Lógica de atualização no frontend
- `scripts/verify-setup.sql` - Script de verificação

