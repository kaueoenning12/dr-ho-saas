# Corrigir Persistência de Likes nos Documentos

## Problema Identificado

O componente `DocumentCard` está usando apenas estado local (`useState`) para gerenciar likes:
- Não verifica se o usuário já deu like no banco de dados
- Não salva o like no banco quando o usuário clica
- Quando o usuário troca de página e volta, o estado local é resetado e o like desaparece

**Arquivo afetado:** `src/components/DocumentCard.tsx`

## Solução

### 1. Integrar Hooks de Like no DocumentCard

**Arquivo:** `src/components/DocumentCard.tsx`

- Importar `useAuth` para obter o usuário atual
- Importar hooks: `useUserDocumentLike`, `useDocumentLikes`, `useToggleDocumentLike`
- Usar `useUserDocumentLike` para verificar se o usuário já deu like
- Usar `useDocumentLikes` para obter o total de likes atualizado do banco
- Usar `useToggleDocumentLike` para salvar/remover like no banco

### 2. Sincronizar Estado Inicial com Banco de Dados

**Arquivo:** `src/components/DocumentCard.tsx`

- Usar `useEffect` para sincronizar o estado `liked` com o resultado de `useUserDocumentLike`
- Usar o valor de `useDocumentLikes` ao invés do estado local para o contador
- Garantir que o estado inicial reflita os dados do banco

### 3. Implementar Salvamento no Banco

**Arquivo:** `src/components/DocumentCard.tsx`

- Modificar `handleLike` para usar `useToggleDocumentLike` mutation
- Salvar o like no banco quando o usuário clicar
- Atualizar estado local apenas após sucesso da mutation
- Tratar erros e mostrar feedback ao usuário

### 4. Invalidar Queries para Atualizar Lista

**Arquivo:** `src/hooks/useDocumentsQuery.ts`

- Verificar se `useToggleDocumentLike` já invalida as queries corretas
- Garantir que invalida `["documents"]` para atualizar a lista de documentos
- Garantir que invalida `["document-likes"]` para atualizar contadores

### 5. Tratamento de Usuário Não Autenticado

**Arquivo:** `src/components/DocumentCard.tsx`

- Verificar se o usuário está autenticado antes de permitir dar like
- Se não autenticado, redirecionar para login ou mostrar mensagem
- Desabilitar botão de like se não autenticado

## Arquivos a Modificar

- `src/components/DocumentCard.tsx` - Integrar hooks e salvar no banco
- `src/hooks/useDocumentsQuery.ts` - Verificar/ajustar invalidação de queries (se necessário)

## Considerações

- Manter feedback visual imediato (otimistic update) enquanto salva no banco
- Garantir que o estado local seja sincronizado com o banco ao montar o componente
- Tratar casos onde o usuário não está autenticado
- Garantir que múltiplos cliques rápidos não causem problemas


