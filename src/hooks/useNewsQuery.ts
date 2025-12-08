import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface News {
  id: string;
  title: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
}

// Fetch news from Supabase
export function useNews(isAdmin?: boolean) {
  return useQuery({
    queryKey: ["news", isAdmin],
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      let query = supabase
        .from("news")
        .select("*")
        .order("date", { ascending: false });
      
      // Se não for admin, apenas mostrar publicados (RLS já filtra, mas garante)
      if (!isAdmin) {
        query = query.eq("is_published", true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching news:", error);
        throw error;
      }
      
      return data || [];
    },
  });
}

// Create news
export function useCreateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newsData: Omit<News, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("news")
        .insert({
          title: newsData.title,
          description: newsData.description,
          date: newsData.date,
          is_published: newsData.is_published,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Novidade criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar novidade: " + error.message);
    },
  });
}

// Update news
export function useUpdateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<News> }) => {
      const { data, error } = await supabase
        .from("news")
        .update({
          title: updates.title,
          description: updates.description,
          date: updates.date,
          is_published: updates.is_published,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Novidade atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar novidade: " + error.message);
    },
  });
}

// Delete news
export function useDeleteNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Novidade excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir novidade: " + error.message);
    },
  });
}
