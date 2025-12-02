# 🚀 Como Fazer Deploy da Edge Function

## Problema
A Edge Function precisa ser deployada no Supabase para funcionar. O erro de CORS indica que a função pode não estar deployada ou não está respondendo corretamente.

## Solução 1: Deploy via CLI do Supabase

### Pré-requisitos
1. Instalar Supabase CLI:
```bash
npm install -g supabase
```

2. Fazer login:
```bash
supabase login
```

3. Linkar ao projeto:
```bash
supabase link --project-ref jjkptijbjyxbrgbxwgxf
```

### Deploy
```bash
supabase functions deploy upload-document
```

## Solução 2: Deploy via Dashboard

1. Acesse: https://supabase.com/dashboard/project/jjkptijbjyxbrgbxwgxf/functions
2. Clique em "Create a new function"
3. Nome: `upload-document`
4. Cole o conteúdo de `supabase/functions/upload-document/index.ts`
5. Clique em "Deploy"

## Solução 3: Verificar se a Função Existe

Execute no SQL Editor do Supabase:
```sql
SELECT * FROM supabase_functions.functions WHERE name = 'upload-document';
```

## Configurar Variáveis de Ambiente

A Edge Function precisa da variável `SUPABASE_SERVICE_ROLE_KEY`:

1. Vá em: Settings → Edge Functions → Secrets
2. Adicione: `SUPABASE_SERVICE_ROLE_KEY` com o valor da service role key
3. A service role key está em: Settings → API → service_role key

## Testar a Função

Após o deploy, teste com:
```bash
curl -X POST https://jjkptijbjyxbrgbxwgxf.supabase.co/functions/v1/upload-document \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -F "file=@test.pdf" \
  -F "path=test/test.pdf"
```

## Nota Importante

O código agora tenta chamar a Edge Function de duas formas:
1. Via `supabase.functions.invoke()` (método padrão)
2. Via `fetch` direto (se houver erro de CORS)

Se a função não estiver deployada, o sistema tentará as outras estratégias (fetch direto, cliente com token, etc).



