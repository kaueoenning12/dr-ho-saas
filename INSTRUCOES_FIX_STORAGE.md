# 🔧 Instruções para Corrigir Erro de Upload no Storage

## ⚠️ Problema
O erro `ERR_ACCESS_DENIED` ao fazer upload de arquivos indica que as políticas de storage do Supabase não estão permitindo o upload.

## ✅ Solução Rápida

### Passo 1: Abrir Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar SQL de Correção
1. Clique em **New Query**
2. Abra o arquivo `FIX_STORAGE_SIMPLE.sql` deste projeto
3. Copie TODO o conteúdo do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar se Funcionou
1. Execute esta query de verificação:
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
AND policyname LIKE '%documents%';
```

2. Você deve ver 4 políticas listadas:
   - Allow authenticated uploads to documents (INSERT)
   - Allow authenticated reads from documents (SELECT)
   - Allow authenticated updates to documents (UPDATE)
   - Allow authenticated deletes from documents (DELETE)

### Passo 4: Testar Upload
1. Volte para a aplicação
2. Tente fazer upload de um arquivo ou pasta
3. Verifique o console do navegador (F12) para ver os logs de debug

## 🔍 Se Ainda Não Funcionar

### Verificar Autenticação
Execute esta query no SQL Editor para verificar seu usuário:
```sql
SELECT 
  auth.uid() as current_user_id,
  ur.role,
  p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = auth.uid();
```

### Verificar Bucket
Execute esta query para verificar se o bucket existe:
```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

### Ver Logs no Console
1. Abra o console do navegador (F12)
2. Tente fazer upload
3. Procure por logs que começam com `[Folder Upload]` ou `[File Upload]`
4. Verifique se mostra:
   - `hasSession: true`
   - `accessToken: 'present'`
   - Roles do usuário

## 📝 Arquivos SQL Disponíveis

1. **FIX_STORAGE_SIMPLE.sql** ⭐ **USE ESTE PRIMEIRO**
   - Solução mais simples e direta
   - Permite upload para qualquer usuário autenticado

2. **FIX_STORAGE_PERMISSIONS_TEMPORARY.sql**
   - Versão temporária para testes
   - Muito permissiva (use apenas para diagnóstico)

3. **FIX_STORAGE_PERMISSIONS.sql**
   - Versão que verifica roles (admin/moderator)
   - Use após confirmar que o upload funciona

4. **DIAGNOSTIC_STORAGE.sql**
   - Queries de diagnóstico
   - Use para investigar problemas

## ⚡ Solução de Emergência

Se nada funcionar, execute este SQL mínimo:

```sql
-- Remover todas as políticas
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Criar política única muito permissiva
CREATE POLICY "Allow all authenticated" ON storage.objects
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
```

**⚠️ ATENÇÃO**: Esta última solução é muito permissiva e deve ser usada apenas para testes!



