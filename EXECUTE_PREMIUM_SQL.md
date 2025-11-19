# Instruções para Configurar Sistema Premium

## Passo 1: Executar Migração do Banco de Dados

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `supabase/migrations/20251118134503_add_premium_documents.sql`
5. Clique em **Run** para executar a migração

## Passo 2: Verificar se Funcionou

Após executar o SQL, vá em **Database** > **Tables** e verifique se:

- ✅ A tabela `document_unlocks` foi criada
- ✅ A tabela `documents` tem as novas colunas:
  - `is_premium` (boolean)
  - `preview_image_url` (text)

## Passo 3: Testar o Sistema

1. **Como Admin:**
   - Vá em Admin > Upload de Documentos
   - Ao fazer upload, marque o checkbox "Premium Content"
   - Opcionalmente, adicione uma URL de preview

2. **Como Usuário Premium/Avançado:**
   - Vá em Documentos
   - Verá badge "PREMIUM" nos documentos premium
   - Clique em um documento premium
   - Verá a prévia borrada
   - Clique em "Desbloquear Agora"
   - Avalie com estrelas (1-5)
   - Documento será desbloqueado permanentemente

3. **Como Usuário Basic:**
   - Verá badge "PREMIUM" nos documentos
   - Ao clicar, verá mensagem para fazer upgrade

## Notas Importantes

- **Planos Elegíveis:** Apenas usuários com planos "Premium" ou "Advanced" podem desbloquear conteúdos premium
- **Avaliação Obrigatória:** É necessário avaliar com estrelas (1-5) para desbloquear
- **Desbloqueio Permanente:** Uma vez desbloqueado, o documento fica disponível para sempre para aquele usuário
- **Estatísticas:** Admins podem ver estatísticas de desbloqueios e ratings no painel admin

## Troubleshooting

### Erro: "Column 'is_premium' does not exist"
- Execute o SQL novamente
- Verifique se a migração foi executada completamente

### Documentos premium não aparecem com badge
- Limpe o cache do navegador (Ctrl + Shift + R)
- Verifique se o documento foi marcado como premium ao fazer upload

### Não consigo desbloquear sendo usuário Premium
- Verifique seu plano ativo em Billing
- Certifique-se de que o plano é "Premium" ou "Advanced" (não "Basic")

