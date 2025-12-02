-- ==========================================
-- Add Folders Support for Documents
-- ==========================================

-- 1. Create document_folders table
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path)
);

-- 2. Add folder support fields to documents table
ALTER TABLE public.documents
  ADD COLUMN folder_path TEXT,
  ADD COLUMN parent_folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

-- 3. Create indexes for folders
CREATE INDEX document_folders_parent_folder_id_idx ON public.document_folders(parent_folder_id);
CREATE INDEX document_folders_path_idx ON public.document_folders(path);
CREATE INDEX document_folders_author_id_idx ON public.document_folders(author_id);
CREATE INDEX documents_folder_path_idx ON public.documents(folder_path);
CREATE INDEX documents_parent_folder_id_idx ON public.documents(parent_folder_id);

-- 4. Enable RLS on document_folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for document_folders
CREATE POLICY "Published documents' folders are viewable by everyone"
  ON public.document_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.parent_folder_id = document_folders.id
      AND documents.is_published = true
    )
    OR EXISTS (
      SELECT 1 FROM public.document_folders AS child_folders
      WHERE child_folders.parent_folder_id = document_folders.id
    )
  );

CREATE POLICY "Admins and moderators can view all folders"
  ON public.document_folders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authors can view their own folders"
  ON public.document_folders FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Admins and moderators can insert folders"
  ON public.document_folders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can update folders"
  ON public.document_folders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete folders"
  ON public.document_folders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Create trigger to update updated_at for document_folders
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();



