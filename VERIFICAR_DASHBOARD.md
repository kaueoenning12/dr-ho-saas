# 🔍 Como Verificar Bucket e Políticas no Supabase Dashboard

## Passo 1: Verificar se o Bucket Existe

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Storage** (menu lateral esquerdo)
4. Você deve ver o bucket **"documents"** na lista
5. Se não aparecer, o bucket não existe - execute o SQL novamente

## Passo 2: Verificar Políticas de Storage

1. No Dashboard, vá em **Storage** → **Policies**
2. Ou vá em **SQL Editor** e execute:
```sql
SELECT 
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
```

3. Você deve ver políticas relacionadas a "documents"
4. Se não aparecer nenhuma, as políticas não foram criadas

## Passo 3: Verificar RLS (Row Level Security)

1. No **SQL Editor**, execute:
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

2. Se `rls_enabled` for `true`, o RLS está habilitado
3. Se for `false`, o RLS está desabilitado (mais permissivo)

## Passo 4: Verificar Seu Usuário e Roles

1. No **SQL Editor**, execute:
```sql
SELECT 
  auth.uid() as current_user_id,
  ur.role,
  p.email,
  p.name
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = auth.uid();
```

2. Verifique se você tem role de 'admin' ou 'moderator'
3. Se não aparecer nada, você não tem roles configuradas

## Passo 5: Testar Upload Direto no Dashboard

1. Vá em **Storage** → **documents**
2. Clique em **Upload file**
3. Tente fazer upload de um arquivo pequeno
4. Se funcionar no Dashboard mas não no código, o problema é no código
5. Se não funcionar nem no Dashboard, o problema é nas políticas/bucket

## Solução de Emergência

Se nada funcionar, execute este SQL para desabilitar RLS completamente:

```sql
-- DESABILITAR RLS (TEMPORÁRIO - APENAS PARA TESTE!)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**⚠️ ATENÇÃO**: Isso remove TODAS as restrições de segurança. Use apenas para teste!

Para reabilitar depois:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```



