-- ==========================================
-- PHASE 4: Announcements & Notifications
-- ==========================================

-- 1. Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'info' CHECK (category IN ('news', 'update', 'alert', 'info'))
);

-- Create indexes
CREATE INDEX announcements_author_id_idx ON public.announcements(author_id);
CREATE INDEX announcements_created_at_idx ON public.announcements(created_at DESC);
CREATE INDEX announcements_is_published_idx ON public.announcements(is_published);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Announcements RLS policies
CREATE POLICY "Published announcements are viewable by everyone"
  ON public.announcements FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins and moderators can view all announcements"
  ON public.announcements FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can manage announcements"
  ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_document', 'comment', 'like', 'system', 'forum_reply', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX notifications_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX notifications_read_idx ON public.notifications(read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for users"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create triggers for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- PHASE 5: Content Suggestions
-- ==========================================

-- 1. Create content_suggestions table
CREATE TABLE public.content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  suggested_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_response TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))
);

-- Create indexes
CREATE INDEX content_suggestions_suggested_by_id_idx ON public.content_suggestions(suggested_by_id);
CREATE INDEX content_suggestions_status_idx ON public.content_suggestions(status);
CREATE INDEX content_suggestions_created_at_idx ON public.content_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;

-- Content suggestions RLS policies
CREATE POLICY "Users can view their own suggestions"
  ON public.content_suggestions FOR SELECT
  USING (auth.uid() = suggested_by_id);

CREATE POLICY "Admins and moderators can view all suggestions"
  ON public.content_suggestions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authenticated users can create suggestions"
  ON public.content_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by_id);

CREATE POLICY "Users can update their own pending suggestions"
  ON public.content_suggestions FOR UPDATE
  USING (auth.uid() = suggested_by_id AND status = 'pending');

CREATE POLICY "Admins and moderators can manage all suggestions"
  ON public.content_suggestions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2. Create trigger for updated_at
CREATE TRIGGER update_content_suggestions_updated_at
  BEFORE UPDATE ON public.content_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();