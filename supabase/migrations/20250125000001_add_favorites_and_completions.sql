-- ==========================================
-- Add Favorites and Folder Completions Support
-- ==========================================

-- 1. Create document_favorites table
CREATE TABLE IF NOT EXISTS public.document_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Create indexes for document_favorites
CREATE INDEX IF NOT EXISTS document_favorites_user_id_idx ON public.document_favorites(user_id);
CREATE INDEX IF NOT EXISTS document_favorites_document_id_idx ON public.document_favorites(document_id);

-- Enable RLS on document_favorites
ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_favorites
CREATE POLICY "Users can view their own document favorites"
  ON public.document_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document favorites"
  ON public.document_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document favorites"
  ON public.document_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Create folder_favorites table
CREATE TABLE IF NOT EXISTS public.folder_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, folder_id)
);

-- Create indexes for folder_favorites
CREATE INDEX IF NOT EXISTS folder_favorites_user_id_idx ON public.folder_favorites(user_id);
CREATE INDEX IF NOT EXISTS folder_favorites_folder_id_idx ON public.folder_favorites(folder_id);

-- Enable RLS on folder_favorites
ALTER TABLE public.folder_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for folder_favorites
CREATE POLICY "Users can view their own folder favorites"
  ON public.folder_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folder favorites"
  ON public.folder_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folder favorites"
  ON public.folder_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create folder_completions table
CREATE TABLE IF NOT EXISTS public.folder_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.document_folders(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, folder_id)
);

-- Create indexes for folder_completions
CREATE INDEX IF NOT EXISTS folder_completions_user_id_idx ON public.folder_completions(user_id);
CREATE INDEX IF NOT EXISTS folder_completions_folder_id_idx ON public.folder_completions(folder_id);

-- Enable RLS on folder_completions
ALTER TABLE public.folder_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for folder_completions
CREATE POLICY "Users can view their own folder completions"
  ON public.folder_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folder completions"
  ON public.folder_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folder completions"
  ON public.folder_completions FOR DELETE
  USING (auth.uid() = user_id);

