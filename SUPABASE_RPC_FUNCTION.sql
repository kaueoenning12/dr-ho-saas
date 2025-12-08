-- Função RPC para otimizar busca de estatísticas de documentos
-- Execute este SQL no Supabase SQL Editor para criar a função
-- Isso reduzirá drasticamente o tempo de carregamento dos documentos

CREATE OR REPLACE FUNCTION get_document_stats(document_ids uuid[])
RETURNS TABLE(
  document_id uuid,
  views bigint,
  likes bigint,
  comments bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as document_id,
    COALESCE(v.view_count, 0)::bigint as views,
    COALESCE(l.like_count, 0)::bigint as likes,
    COALESCE(c.comment_count, 0)::bigint as comments
  FROM unnest(document_ids) AS d(id)
  LEFT JOIN (
    SELECT document_id, COUNT(*) as view_count
    FROM document_views
    WHERE document_id = ANY(document_ids)
    GROUP BY document_id
  ) v ON v.document_id = d.id
  LEFT JOIN (
    SELECT document_id, COUNT(*) as like_count
    FROM document_likes
    WHERE document_id = ANY(document_ids)
    GROUP BY document_id
  ) l ON l.document_id = d.id
  LEFT JOIN (
    SELECT document_id, COUNT(*) as comment_count
    FROM document_comments
    WHERE document_id = ANY(document_ids)
    GROUP BY document_id
  ) c ON c.document_id = d.id;
END;
$$;

-- Dar permissão para a função ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION get_document_stats(uuid[]) TO authenticated;

-- Comentário sobre a função
COMMENT ON FUNCTION get_document_stats(uuid[]) IS 
'Retorna estatísticas agregadas (views, likes, comments) para uma lista de documentos. 
Otimiza o carregamento ao fazer agregação no banco ao invés de buscar todos os registros.';

