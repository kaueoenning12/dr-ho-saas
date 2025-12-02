import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch suggestions (users see their own, admins see all) - queries separadas para evitar erro 400
export function useSuggestions(userId?: string, isAdmin?: boolean) {
  return useQuery({
    queryKey: ["suggestions", userId, isAdmin],
    queryFn: async () => {
      // 1. Buscar suggestions
      let query = supabase
        .from("content_suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      // If not admin, only show own suggestions
      if (!isAdmin && userId) {
        query = query.eq("suggested_by_id", userId);
      }

      const { data: suggestions, error } = await query;
      if (error) throw error;
      if (!suggestions || suggestions.length === 0) return [];

      // 2. Buscar profiles dos autores
      const authorIds = [...new Set(suggestions.map(s => s.suggested_by_id).filter(Boolean))];
      if (authorIds.length === 0) return suggestions;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", authorIds);

      // 3. Combinar dados
      return suggestions.map(suggestion => ({
        ...suggestion,
        author: profiles?.find(p => p.user_id === suggestion.suggested_by_id) || null
      }));
    },
    enabled: !!userId || isAdmin,
  });
}

// Create suggestion
export function useCreateSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionData: any) => {
      const { data, error } = await supabase
        .from("content_suggestions")
        .insert(suggestionData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Sugestão enviada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar sugestão: " + error.message);
    },
  });
}

// Update suggestion (admin only)
export function useUpdateSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("content_suggestions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar sugestão: " + error.message);
    },
  });
}

// Delete suggestion (admin only)
export function useDeleteSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("content_suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Sugestão excluída!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir sugestão: " + error.message);
    },
  });
}
