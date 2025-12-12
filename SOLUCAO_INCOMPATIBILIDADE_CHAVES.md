# 🔧 Solução: Incompatibilidade entre Chaves do Stripe

## 🐛 Problema Identificado

O erro indica que a Edge Function está usando uma **chave de TESTE** mesmo quando o banco de dados tem uma **chave de PRODUÇÃO** configurada:

```
No such price: 'price_1SdFEiRpUByu4yV9NB4rlLe6'; 
a similar object exists in live mode, but a test mode key was used to make this request.
```

### Análise dos Logs

**Frontend (Plans.tsx):**
- ✅ Detecta: Chave PRODUÇÃO no banco
- ✅ Detecta: Price ID PRODUÇÃO
- ✅ Mostra: "✅ COMPATÍVEL"

**Edge Function (create-checkout-session):**
- ❌ Usa: Chave de TESTE (da variável de ambiente)
- ❌ Resultado: Erro de incompatibilidade

## 🔍 Causa Raiz

A Edge Function está usando o **fallback** `Deno.env.get('STRIPE_SECRET_KEY')` em vez da configuração do banco de dados (`stripe_config`).

Isso acontece quando:
1. A variável de ambiente `STRIPE_SECRET_KEY` está configurada no Supabase com uma chave de **TESTE**
2. A Edge Function tenta buscar do banco, mas por algum motivo usa o fallback
3. O fallback tem prioridade sobre a configuração do banco

## ✅ Solução

### Opção 1: Remover Variável de Ambiente (Recomendado)

A configuração deve vir **apenas do banco de dados** (`stripe_config`). Remova a variável de ambiente:

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. **Remova** ou **desative** a variável `STRIPE_SECRET_KEY`
4. Certifique-se de que a tabela `stripe_config` tem uma configuração ativa com `is_active = true`

### Opção 2: Atualizar Variável de Ambiente para Produção

Se você precisa manter a variável de ambiente como fallback:

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. **Atualize** `STRIPE_SECRET_KEY` com a chave de **PRODUÇÃO** (`sk_live_...`)

⚠️ **NOTA:** A Opção 1 é recomendada porque:
- Centraliza a configuração no banco de dados
- Permite gerenciar via UI admin
- Evita conflitos entre variáveis de ambiente e banco

## 🔍 Como Verificar

### 1. Verificar Configuração no Banco

Execute no Supabase SQL Editor:

```sql
SELECT 
  id,
  environment,
  is_active,
  CASE 
    WHEN secret_key LIKE 'sk_test_%' THEN 'TESTE'
    WHEN secret_key LIKE 'sk_live_%' THEN 'PRODUÇÃO'
    ELSE 'DESCONHECIDO'
  END as tipo_chave,
  SUBSTRING(secret_key, 1, 20) || '...' as secret_key_preview,
  SUBSTRING(publishable_key, 1, 20) || '...' as publishable_key_preview
FROM stripe_config
ORDER BY is_active DESC, environment;
```

**Resultado esperado:**
- Uma configuração com `is_active = true`
- `environment = 'live'` (ou 'test' se ainda estiver em teste)
- `tipo_chave = 'PRODUÇÃO'` (se em produção)

### 2. Verificar Variáveis de Ambiente no Supabase

1. Acesse **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Verifique se `STRIPE_SECRET_KEY` existe e qual é o tipo

### 3. Verificar Logs da Edge Function

Após fazer o checkout, verifique os logs da Edge Function no Supabase Dashboard:

1. Acesse **Edge Functions** → **create-checkout-session**
2. Veja os logs mais recentes
3. Procure por: `🔧 CHAVE FINAL QUE SERÁ USADA:`
4. Verifique:
   - `secretKeySource`: Deve ser `'Banco de Dados (stripe_config)'`
   - `secretKeyType`: Deve ser `'PRODUCTION'` (se em produção)

## 📋 Checklist de Correção

- [ ] Verificar configuração ativa no banco (`stripe_config` com `is_active = true`)
- [ ] Verificar se a chave no banco é de PRODUÇÃO (`sk_live_...`)
- [ ] Verificar variável de ambiente `STRIPE_SECRET_KEY` no Supabase
- [ ] Remover ou atualizar variável de ambiente para produção
- [ ] Testar checkout novamente
- [ ] Verificar logs da Edge Function para confirmar que está usando a chave do banco

## 🚨 Importante

**A variável de ambiente `STRIPE_SECRET_KEY` no Supabase tem prioridade sobre o banco de dados quando está configurada.**

Para garantir que a configuração do banco seja usada:
1. **Remova** a variável de ambiente `STRIPE_SECRET_KEY` do Supabase
2. Ou **atualize** para a mesma chave que está no banco

## 📝 Notas Adicionais

- O frontend sempre mostra a configuração do banco corretamente
- O problema está apenas na Edge Function usando o fallback
- Os logs agora mostram claramente qual chave está sendo usada
- A Edge Function prioriza: Banco → Request Body → Deno.env

## 🔗 Arquivos Relacionados

- `supabase/functions/create-checkout-session/index.ts` - Edge Function que cria checkout
- `src/pages/Plans.tsx` - Frontend que inicia checkout
- `verificar_chaves_stripe.sql` - Script para verificar configurações

