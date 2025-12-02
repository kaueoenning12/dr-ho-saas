-- ==========================================
-- PHASE 7: Admin Statistics & Analytics
-- ==========================================

-- 1. Create function to get document statistics
CREATE OR REPLACE FUNCTION public.get_document_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_documents', (SELECT COUNT(*) FROM documents),
    'published_documents', (SELECT COUNT(*) FROM documents WHERE is_published = true),
    'total_views', (SELECT COUNT(*) FROM document_views),
    'total_likes', (SELECT COUNT(*) FROM document_likes),
    'total_comments', (SELECT COUNT(*) FROM document_comments),
    'documents_by_category', (
      SELECT json_object_agg(category, count)
      FROM (
        SELECT category, COUNT(*) as count
        FROM documents
        WHERE is_published = true
        GROUP BY category
      ) cat_counts
    )
  );
$$;

-- 2. Create function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_subscriptions', (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active'),
    'users_by_role', (
      SELECT json_object_agg(role, count)
      FROM (
        SELECT role, COUNT(*) as count
        FROM user_roles
        GROUP BY role
      ) role_counts
    ),
    'users_by_plan', (
      SELECT json_object_agg(plan_name, count)
      FROM (
        SELECT sp.name as plan_name, COUNT(*) as count
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        GROUP BY sp.name
      ) plan_counts
    )
  );
$$;

-- 3. Create function to get forum statistics
CREATE OR REPLACE FUNCTION public.get_forum_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_topics', (SELECT COUNT(*) FROM forum_topics),
    'total_replies', (SELECT COUNT(*) FROM forum_replies),
    'total_votes', (SELECT COUNT(*) FROM forum_reply_votes),
    'topics_by_category', (
      SELECT json_object_agg(category_name, count)
      FROM (
        SELECT fc.name as category_name, COUNT(ft.id) as count
        FROM forum_categories fc
        LEFT JOIN forum_topics ft ON fc.id = ft.category_id
        GROUP BY fc.name
      ) cat_counts
    )
  );
$$;

-- 4. Create function to get platform statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'announcements', (
      SELECT json_build_object(
        'total', COUNT(*),
        'published', COUNT(*) FILTER (WHERE is_published = true)
      )
      FROM announcements
    ),
    'suggestions', (
      SELECT json_build_object(
        'total', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected')
      )
      FROM content_suggestions
    ),
    'notifications', (
      SELECT json_build_object(
        'total', COUNT(*),
        'unread', COUNT(*) FILTER (WHERE read = false)
      )
      FROM notifications
    )
  );
$$;

-- 5. Grant execute permissions to authenticated users for stats functions
GRANT EXECUTE ON FUNCTION public.get_document_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forum_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;