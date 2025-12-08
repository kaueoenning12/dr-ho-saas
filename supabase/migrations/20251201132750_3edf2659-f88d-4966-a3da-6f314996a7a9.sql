-- Criar tabela document_categories
CREATE TABLE public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- 1. Qualquer usuário pode ver categorias
CREATE POLICY "Anyone can view document categories"
ON public.document_categories
FOR SELECT
TO public
USING (true);

-- 2. Admins e moderadores podem criar categorias
CREATE POLICY "Admins and moderators can create categories"
ON public.document_categories
FOR INSERT
TO public
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
);

-- 3. Admins e moderadores podem atualizar categorias
CREATE POLICY "Admins and moderators can update categories"
ON public.document_categories
FOR UPDATE
TO public
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'moderator'::app_role)
);

-- 4. Admins podem deletar categorias
CREATE POLICY "Admins can delete categories"
ON public.document_categories
FOR DELETE
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON public.document_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índice para busca por nome
CREATE INDEX idx_document_categories_name ON public.document_categories(name);

-- Migrar categorias existentes dos documentos
INSERT INTO public.document_categories (name)
SELECT DISTINCT category 
FROM public.documents
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;