import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentFilters {
  category?: string;
  searchTerm?: string;
  showOnlyNew?: boolean;
}

// Fetch all published documents
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (filters?.category && filters.category !== "Todas") {
        query = query.eq("category", filters.category);
      }

      if (filters?.searchTerm) {
        query = query.textSearch("search_vector", filters.searchTerm);
      }

      if (filters?.showOnlyNew) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte("published_at", thirtyDaysAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch single document by ID
export function useDocumentById(id: string | null) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Create document
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentData: any) => {
      const { data, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar documento: " + error.message);
    },
  });
}

// Update document
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar documento: " + error.message);
    },
  });
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir documento: " + error.message);
    },
  });
}

// Track document view
export function useTrackDocumentView() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("document_views")
        .insert({ document_id: documentId });
      if (error) throw error;
    },
  });
}

// Fetch document likes
export function useDocumentLikes(documentId: string) {
  return useQuery({
    queryKey: ["document-likes", documentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_likes")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!documentId,
  });
}

// Check if user liked document
export function useUserDocumentLike(documentId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-document-like", documentId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("document_likes")
        .select("*")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId && !!userId,
  });
}

// Toggle document like
export function useToggleDocumentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, userId }: { documentId: string; userId: string }) => {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("document_likes")
        .select("id")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from("document_likes")
          .delete()
          .eq("id", existingLike.id);
        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await supabase
          .from("document_likes")
          .insert({ document_id: documentId, user_id: userId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-likes"] });
      queryClient.invalidateQueries({ queryKey: ["user-document-like"] });
    },
  });
}

// Fetch document comments
export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ["document-comments", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_comments")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId,
  });
}

// Create comment
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      userId,
      content,
    }: {
      documentId: string;
      userId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("document_comments")
        .insert({
          document_id: documentId,
          user_id: userId,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-comments"] });
      toast.success("Comentário adicionado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar comentário: " + error.message);
    },
  });
}
