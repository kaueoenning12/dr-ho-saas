import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a folder is completed by user
 */
export function useFolderCompletion(folderId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["folder-completion", folderId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("folder_completions")
        .select("id")
        .eq("folder_id", folderId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!folderId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Batch check folder completions for multiple folders
 */
export function useBatchFolderCompletions(folderIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ["folder-completions-batch", folderIds, userId],
    queryFn: async () => {
      if (!userId || folderIds.length === 0) return new Set<string>();
      
      const { data, error } = await supabase
        .from("folder_completions")
        .select("folder_id")
        .eq("user_id", userId)
        .in("folder_id", folderIds);
      
      if (error) throw error;
      return new Set(data?.map((item) => item.folder_id) || []);
    },
    enabled: folderIds.length > 0 && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Toggle folder completion
 */
export function useToggleFolderCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) => {
      // Check if already completed
      const { data: existingCompletion } = await supabase
        .from("folder_completions")
        .select("id")
        .eq("folder_id", folderId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingCompletion) {
        // Uncomplete
        const { error } = await supabase
          .from("folder_completions")
          .delete()
          .eq("id", existingCompletion.id);
        if (error) throw error;
        return false;
      } else {
        // Complete
        const { error } = await supabase
          .from("folder_completions")
          .insert({ folder_id: folderId, user_id: userId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-completion"] });
      queryClient.invalidateQueries({ queryKey: ["folder-completions-batch"] });
      queryClient.invalidateQueries({ queryKey: ["root-contents"] });
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
    },
  });
}





