-- Adicionar colunas para documentos premium
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Criar tabela para registrar desbloqueios de documentos premium
CREATE TABLE IF NOT EXISTS document_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- Habilitar RLS
ALTER TABLE document_unlocks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para document_unlocks
CREATE POLICY "Usuários podem ver seus próprios desbloqueios"
  ON document_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar desbloqueios"
  ON document_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os desbloqueios"
  ON document_unlocks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_document_unlocks_user_id ON document_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_unlocks_document_id ON document_unlocks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_premium ON documents(is_premium) WHERE is_premium = true;