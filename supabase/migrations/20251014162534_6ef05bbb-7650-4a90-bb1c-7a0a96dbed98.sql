-- ==========================================
-- PHASE 2: Documents & Content Management (FIXED v2)
-- ==========================================

-- 1. Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  pdf_url TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  file_size BIGINT,
  search_vector tsvector
);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', 
    coalesce(NEW.title, '') || ' ' || 
    coalesce(NEW.description, '') || ' ' || 
    coalesce(array_to_string(NEW.keywords, ' '), '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger to update search vector
CREATE TRIGGER document_search_vector_update
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_search_vector();

-- Create GIN index for full-text search
CREATE INDEX documents_search_idx ON public.documents USING GIN (search_vector);

-- Create indexes for common queries
CREATE INDEX documents_category_idx ON public.documents(category);
CREATE INDEX documents_published_at_idx ON public.documents(published_at DESC);
CREATE INDEX documents_author_id_idx ON public.documents(author_id);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Documents RLS policies
CREATE POLICY "Published documents are viewable by everyone"
  ON public.documents FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins and moderators can view all documents"
  ON public.documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authors can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Admins and moderators can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update documents"
  ON public.documents FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create document_views table
CREATE TABLE public.document_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX document_views_document_id_idx ON public.document_views(document_id);
CREATE INDEX document_views_user_id_idx ON public.document_views(user_id);
CREATE INDEX document_views_viewed_at_idx ON public.document_views(viewed_at DESC);

-- Enable RLS on document_views
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

-- Document views RLS policies
CREATE POLICY "Anyone can insert document views"
  ON public.document_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own views"
  ON public.document_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all document views"
  ON public.document_views FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create document_likes table
CREATE TABLE public.document_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Create indexes
CREATE INDEX document_likes_document_id_idx ON public.document_likes(document_id);
CREATE INDEX document_likes_user_id_idx ON public.document_likes(user_id);

-- Enable RLS on document_likes
ALTER TABLE public.document_likes ENABLE ROW LEVEL SECURITY;

-- Document likes RLS policies
CREATE POLICY "Anyone can view document likes"
  ON public.document_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like documents"
  ON public.document_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.document_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create document_comments table
CREATE TABLE public.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX document_comments_document_id_idx ON public.document_comments(document_id);
CREATE INDEX document_comments_user_id_idx ON public.document_comments(user_id);
CREATE INDEX document_comments_created_at_idx ON public.document_comments(created_at DESC);

-- Enable RLS on document_comments
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Document comments RLS policies
CREATE POLICY "Anyone can view comments on published documents"
  ON public.document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = document_comments.document_id 
      AND documents.is_published = true
    )
  );

CREATE POLICY "Authenticated users can post comments"
  ON public.document_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.document_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.document_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can delete any comment"
  ON public.document_comments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 5. Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();