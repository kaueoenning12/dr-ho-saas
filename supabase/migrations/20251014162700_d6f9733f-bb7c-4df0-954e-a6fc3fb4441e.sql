-- ==========================================
-- PHASE 3: Forum & Community Features
-- ==========================================

-- 1. Create forum_categories table
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

-- Forum categories RLS policies
CREATE POLICY "Forum categories are viewable by everyone"
  ON public.forum_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins and moderators can manage categories"
  ON public.forum_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2. Create forum_topics table
CREATE TABLE public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX forum_topics_category_id_idx ON public.forum_topics(category_id);
CREATE INDEX forum_topics_author_id_idx ON public.forum_topics(author_id);
CREATE INDEX forum_topics_created_at_idx ON public.forum_topics(created_at DESC);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

-- Forum topics RLS policies
CREATE POLICY "Forum topics are viewable by everyone"
  ON public.forum_topics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create topics"
  ON public.forum_topics FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own topics"
  ON public.forum_topics FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins and moderators can manage all topics"
  ON public.forum_topics FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 3. Create forum_replies table
CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.forum_topics(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  is_solution BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX forum_replies_topic_id_idx ON public.forum_replies(topic_id);
CREATE INDEX forum_replies_author_id_idx ON public.forum_replies(author_id);
CREATE INDEX forum_replies_created_at_idx ON public.forum_replies(created_at DESC);

-- Enable RLS
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Forum replies RLS policies
CREATE POLICY "Forum replies are viewable by everyone"
  ON public.forum_replies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON public.forum_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own replies"
  ON public.forum_replies FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own replies"
  ON public.forum_replies FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins and moderators can manage all replies"
  ON public.forum_replies FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 4. Create forum_reply_votes table
CREATE TABLE public.forum_reply_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- Create indexes
CREATE INDEX forum_reply_votes_reply_id_idx ON public.forum_reply_votes(reply_id);
CREATE INDEX forum_reply_votes_user_id_idx ON public.forum_reply_votes(user_id);

-- Enable RLS
ALTER TABLE public.forum_reply_votes ENABLE ROW LEVEL SECURITY;

-- Forum reply votes RLS policies
CREATE POLICY "Forum reply votes are viewable by everyone"
  ON public.forum_reply_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.forum_reply_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their own votes"
  ON public.forum_reply_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
  ON public.forum_reply_votes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create triggers for updated_at
CREATE TRIGGER update_forum_topics_updated_at
  BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Insert default forum categories
INSERT INTO public.forum_categories (name, description) VALUES
  ('Geral', 'Discussões gerais sobre SST'),
  ('Dúvidas', 'Tire suas dúvidas sobre segurança do trabalho'),
  ('Legislação', 'Discussões sobre normas e legislação'),
  ('Casos Práticos', 'Compartilhe experiências e casos práticos'),
  ('Sugestões', 'Sugestões de melhorias para a plataforma');