# 🔧 Solução Final para ERR_ACCESS_DENIED no Storage

## ⚠️ Problema
O erro `ERR_ACCESS_DENIED` persiste mesmo após executar SQLs. Isso indica problema nas políticas de storage do Supabase.

## ✅ Solução em Ordem de Prioridade

### OPÇÃO 1: SQL de Emergência (MAIS PERMISSIVO)
**Arquivo**: `FIX_STORAGE_EMERGENCY.sql`

Este SQL **desabilita RLS completamente**, removendo todas as restrições. Use apenas para testar se o problema é realmente nas políticas.

**Execute este primeiro** para confirmar que o upload funciona sem RLS.

### OPÇÃO 2: SQL Ultra Permissivo
**Arquivo**: `FIX_STORAGE_ULTRA_PERMISSIVE.sql`

Desabilita RLS mas cria política permissiva para quando reabilitar.

### OPÇÃO 3: SQL Simples
**Arquivo**: `FIX_STORAGE_SIMPLE.sql`

Cria políticas que permitem upload para usuários autenticados (mantém RLS habilitado).

## 📋 Passo a Passo

### 1. Execute o SQL de Emergência
1. Abra Supabase Dashboard → SQL Editor
2. Copie e execute `FIX_STORAGE_EMERGENCY.sql`
3. Verifique se apareceu mensagem de sucesso
4. Tente fazer upload novamente

### 2. Verifique os Logs no Console
Abra o console do navegador (F12) e procure por:
- `[Folder Upload] Verificando autenticação`
- `hasToken: true`
- `tokenPreview: ...`

### 3. Se Ainda Não Funcionar
Execute estas queries de diagnóstico no SQL Editor:

```sql
-- Verificar se RLS está desabilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Verificar políticas
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

### 4. Verificar no Dashboard
1. Vá em **Storage** no Dashboard
2. Verifique se o bucket "documents" aparece
3. Tente fazer upload manualmente pelo Dashboard
4. Se funcionar no Dashboard mas não no código, o problema é no código
5. Se não funcionar nem no Dashboard, o problema é nas políticas

## 🔍 Diagnóstico Adicional

Se o erro persistir mesmo após desabilitar RLS, pode ser:
1. **Problema de CORS** - Verifique configurações de CORS no Supabase
2. **Token não está sendo enviado** - Verifique logs no console
3. **Bucket não existe** - Execute o SQL novamente
4. **Problema de rede** - Verifique se há bloqueadores de requisições

## 📝 Arquivos SQL Disponíveis

1. **FIX_STORAGE_EMERGENCY.sql** ⭐ **EXECUTE ESTE PRIMEIRO**
   - Desabilita RLS completamente
   - Mais permissivo possível
   - Use para confirmar que o problema é nas políticas

2. **FIX_STORAGE_ULTRA_PERMISSIVE.sql**
   - Desabilita RLS + cria política permissiva

3. **FIX_STORAGE_SIMPLE.sql**
   - Mantém RLS habilitado
   - Cria políticas para usuários autenticados

4. **DIAGNOSTIC_STORAGE.sql**
   - Queries de diagnóstico
   - Use para investigar problemas

## ⚡ Comando Rápido

Se quiser apenas desabilitar RLS rapidamente:

```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

Para reabilitar depois:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```



