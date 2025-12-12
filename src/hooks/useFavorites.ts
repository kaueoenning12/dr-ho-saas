import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a document is favorited by user
 */
export function useDocumentFavorite(documentId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["document-favorite", documentId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("document_favorites")
        .select("id")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!documentId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Check if a folder is favorited by user
 */
export function useFolderFavorite(folderId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["folder-favorite", folderId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("folder_favorites")
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
 * Batch check document favorites for multiple documents
 */
export function useBatchDocumentFavorites(documentIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ["document-favorites-batch", documentIds, userId],
    queryFn: async () => {
      if (!userId || documentIds.length === 0) return new Set<string>();
      
      const { data, error } = await supabase
        .from("document_favorites")
        .select("document_id")
        .eq("user_id", userId)
        .in("document_id", documentIds);
      
      if (error) throw error;
      return new Set(data?.map((item) => item.document_id) || []);
    },
    enabled: documentIds.length > 0 && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Batch check folder favorites for multiple folders
 */
export function useBatchFolderFavorites(folderIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ["folder-favorites-batch", folderIds, userId],
    queryFn: async () => {
      if (!userId || folderIds.length === 0) return new Set<string>();
      
      const { data, error } = await supabase
        .from("folder_favorites")
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
 * Fetch all document favorites for a user (used when filtering by favorites)
 */
export function useAllDocumentFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ["all-document-favorites", userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      
      const { data, error } = await supabase
        .from("document_favorites")
        .select("document_id")
        .eq("user_id", userId);
      
      if (error) throw error;
      return new Set(data?.map((item) => item.document_id) || []);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch all folder favorites for a user (used when filtering by favorites)
 */
export function useAllFolderFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ["all-folder-favorites", userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      
      const { data, error } = await supabase
        .from("folder_favorites")
        .select("folder_id")
        .eq("user_id", userId);
      
      if (error) throw error;
      return new Set(data?.map((item) => item.folder_id) || []);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch all favorite documents for a user (used when filtering by favorites)
 */
export function useAllFavoriteDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ["all-favorite-documents", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get favorite document IDs
      const { data: favorites, error: favoritesError } = await supabase
        .from("document_favorites")
        .select("document_id")
        .eq("user_id", userId);
      
      if (favoritesError) throw favoritesError;
      if (!favorites || favorites.length === 0) return [];
      
      const favoriteIds = favorites.map(f => f.document_id);
      
      // Fetch all favorite documents
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("is_published", true)
        .in("id", favoriteIds)
        .order("published_at", { ascending: false });
      
      if (documentsError) throw documentsError;
      return documents || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Toggle document favorite
 */
export function useToggleDocumentFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, userId }: { documentId: string; userId: string }) => {
      // Check if already favorited
      const { data: existingFavorite, error: checkError } = await supabase
        .from("document_favorites")
        .select("id")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingFavorite) {
        // Unfavorite
        const { error } = await supabase
          .from("document_favorites")
          .delete()
          .eq("id", existingFavorite.id);
        if (error) {
          throw error;
        }
        return false;
      } else {
        // Favorite
        const { error } = await supabase
          .from("document_favorites")
          .insert({ document_id: documentId, user_id: userId });
        if (error) {
          throw error;
        }
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-favorite"] });
      queryClient.invalidateQueries({ queryKey: ["document-favorites-batch"] });
      queryClient.invalidateQueries({ queryKey: ["all-document-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["all-favorite-documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["root-contents"] });
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
    },
  });
}

/**
 * Toggle folder favorite
 */
export function useToggleFolderFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) => {
      // Check if already favorited
      const { data: existingFavorite, error: checkError } = await supabase
        .from("folder_favorites")
        .select("id")
        .eq("folder_id", folderId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingFavorite) {
        // Unfavorite
        const { error } = await supabase
          .from("folder_favorites")
          .delete()
          .eq("id", existingFavorite.id);
        if (error) {
          throw error;
        }
        return false;
      } else {
        // Favorite
        const { error } = await supabase
          .from("folder_favorites")
          .insert({ folder_id: folderId, user_id: userId });
        if (error) {
          throw error;
        }
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folder-favorite"] });
      queryClient.invalidateQueries({ queryKey: ["folder-favorites-batch"] });
      queryClient.invalidateQueries({ queryKey: ["all-folder-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["root-contents"] });
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
    },
  });
}

