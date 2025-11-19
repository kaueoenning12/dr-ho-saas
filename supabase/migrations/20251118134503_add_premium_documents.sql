-- Add premium fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Create document_unlocks table for tracking user unlocks and ratings
CREATE TABLE IF NOT EXISTS document_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_unlocks_user ON document_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_unlocks_document ON document_unlocks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_premium ON documents(is_premium) WHERE is_premium = true;

-- Enable RLS on document_unlocks
ALTER TABLE document_unlocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own unlocks" ON document_unlocks;
DROP POLICY IF EXISTS "Users can unlock documents" ON document_unlocks;
DROP POLICY IF EXISTS "Admins can view all unlocks" ON document_unlocks;

-- Users can view their own unlocks
CREATE POLICY "Users can view own unlocks"
  ON document_unlocks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create unlocks (desbloquear documentos)
CREATE POLICY "Users can unlock documents"
  ON document_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all unlocks
CREATE POLICY "Admins can view all unlocks"
  ON document_unlocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment explaining the premium system
COMMENT ON COLUMN documents.is_premium IS 'Indicates if this document requires unlock via rating';
COMMENT ON COLUMN documents.preview_image_url IS 'Optional preview image URL to show when document is locked';
COMMENT ON TABLE document_unlocks IS 'Tracks which users have unlocked which premium documents and their ratings';

