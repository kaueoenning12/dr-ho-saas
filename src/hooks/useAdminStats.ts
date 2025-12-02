import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Use database function for document stats
export function useDocumentStats() {
  return useQuery({
    queryKey: ["document-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_document_stats");
      if (error) throw error;
      return data || {};
    },
  });
}

// Use database function for user stats
export function useUserStats() {
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_stats");
      if (error) throw error;
      return data || {};
    },
  });
}

// Use database function for forum stats
export function useForumStats() {
  return useQuery({
    queryKey: ["forum-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_forum_stats");
      if (error) throw error;
      return data || {};
    },
  });
}

// Use database function for platform stats
export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      return data || {};
    },
  });
}
