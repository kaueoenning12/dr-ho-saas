-- ==========================================
-- Notifications System: Real-time & Triggers
-- ==========================================

-- 1. Enable real-time for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications table to realtime publication if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 2. Create function to notify users about new published documents
CREATE OR REPLACE FUNCTION public.notify_new_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_payload jsonb;
BEGIN
  -- Only trigger if document is being published (not already published)
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    
    notification_payload := jsonb_build_object(
      'event_type', 'new_document',
      'title', 'New Document Published',
      'message', NEW.title || ' has been published',
      'link', '/?doc=' || NEW.id::text,
      'exclude_user_id', NEW.author_id
    );

    -- Call edge function to create notifications (using pg_net or immediate insert)
    -- For simplicity, we'll insert notifications directly here
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    SELECT 
      p.user_id,
      'new_document',
      'New Document Published',
      NEW.title || ' has been published',
      '/?doc=' || NEW.id::text,
      false
    FROM public.profiles p
    WHERE p.user_id != NEW.author_id; -- Don't notify the author
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger for new published documents
DROP TRIGGER IF EXISTS on_document_published ON public.documents;
CREATE TRIGGER on_document_published
  AFTER INSERT OR UPDATE OF is_published ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_document();

-- 4. Create function to notify document author about new comments
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_author_id uuid;
  doc_title text;
BEGIN
  -- Get document author and title
  SELECT author_id, title INTO doc_author_id, doc_title
  FROM public.documents
  WHERE id = NEW.document_id;
  
  -- Only notify if commenter is not the document author
  IF doc_author_id IS NOT NULL AND doc_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    VALUES (
      doc_author_id,
      'comment',
      'New Comment',
      'Someone commented on your document: ' || doc_title,
      '/?doc=' || NEW.document_id::text,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger for new comments
DROP TRIGGER IF EXISTS on_comment_created ON public.document_comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.document_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();

-- 6. Create function to notify document author about new likes
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_author_id uuid;
  doc_title text;
BEGIN
  -- Get document author and title
  SELECT author_id, title INTO doc_author_id, doc_title
  FROM public.documents
  WHERE id = NEW.document_id;
  
  -- Only notify if liker is not the document author
  IF doc_author_id IS NOT NULL AND doc_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    VALUES (
      doc_author_id,
      'like',
      'New Like',
      'Someone liked your document: ' || doc_title,
      '/?doc=' || NEW.document_id::text,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create trigger for new likes
DROP TRIGGER IF EXISTS on_document_liked ON public.document_likes;
CREATE TRIGGER on_document_liked
  AFTER INSERT ON public.document_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_like();

-- 8. Create function to notify users about new published announcements
CREATE OR REPLACE FUNCTION public.notify_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if announcement is being published
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    SELECT 
      p.user_id,
      'system',
      'New Announcement',
      NEW.title,
      '/announcements',
      false
    FROM public.profiles p;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Create trigger for new published announcements
DROP TRIGGER IF EXISTS on_announcement_published ON public.announcements;
CREATE TRIGGER on_announcement_published
  AFTER INSERT OR UPDATE OF is_published ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_announcement();

-- 10. Create function to notify suggestion author about status changes
CREATE OR REPLACE FUNCTION public.notify_suggestion_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if status changed
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    VALUES (
      NEW.suggested_by_id,
      'system',
      'Suggestion Status Updated',
      'Your suggestion "' || NEW.title || '" is now ' || NEW.status,
      '/suggestions',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. Create trigger for suggestion status changes
DROP TRIGGER IF EXISTS on_suggestion_status_changed ON public.content_suggestions;
CREATE TRIGGER on_suggestion_status_changed
  AFTER UPDATE OF status ON public.content_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_suggestion_status_changed();