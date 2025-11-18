import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StarRating } from "@/types/premium";
import { toast } from "@/hooks/use-toast";

/**
 * Check if a document is unlocked for the current user
 */
export function useIsDocumentUnlocked(documentId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["document-unlock", documentId, user?.id],
    queryFn: async () => {
      if (!user || !documentId) {
        return { isUnlocked: false, rating: null };
      }

      const { data, error } = await supabase
        .from("document_unlocks")
        .select("id, rating")
        .eq("user_id", user.id)
        .eq("document_id", documentId)
        .maybeSingle();

      if (error) {
        console.error("Error checking unlock status:", error);
        return { isUnlocked: false, rating: null };
      }

      return {
        isUnlocked: !!data,
        rating: data?.rating || null,
      };
    },
    enabled: !!user && !!documentId,
  });
}

/**
 * Get the user's rating for a specific document
 */
export function useDocumentRating(documentId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["document-rating", documentId, user?.id],
    queryFn: async () => {
      if (!user || !documentId) {
        return null;
      }

      const { data, error } = await supabase
        .from("document_unlocks")
        .select("rating")
        .eq("user_id", user.id)
        .eq("document_id", documentId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching rating:", error);
        return null;
      }

      return data?.rating || null;
    },
    enabled: !!user && !!documentId,
  });
}

/**
 * Unlock a document with a rating
 */
export function useUnlockDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      rating,
    }: {
      documentId: string;
      rating: StarRating;
    }) => {
      if (!user) {
        throw new Error("Você precisa estar autenticado para desbloquear documentos");
      }

      const { data, error } = await supabase
        .from("document_unlocks")
        .insert({
          user_id: user.id,
          document_id: documentId,
          rating,
        })
        .select()
        .single();

      if (error) {
        console.error("Error unlocking document:", error);
        throw new Error("Erro ao desbloquear documento. Tente novamente.");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch unlock status
      queryClient.invalidateQueries({
        queryKey: ["document-unlock", variables.documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["document-rating", variables.documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      toast({
        title: "Documento desbloqueado!",
        description: "Agora você tem acesso completo a este conteúdo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desbloquear",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Get all unlocks for the current user (useful for admin stats)
 */
export function useUserUnlocks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-unlocks", user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("document_unlocks")
        .select(`
          id,
          document_id,
          rating,
          unlocked_at,
          documents (
            title,
            category
          )
        `)
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });

      if (error) {
        console.error("Error fetching user unlocks:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });
}

