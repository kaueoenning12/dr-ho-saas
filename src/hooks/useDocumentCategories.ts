import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DbCategory = Database["public"]["Tables"]["document_categories"]["Row"];

const QUERY_KEY = ["document-categories"];

export function useDocumentCategories() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as DbCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - categorias não mudam frequentemente
    refetchOnWindowFocus: false,
  });
}

export function useCreateDocumentCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Nome da categoria não pode ser vazio");
      }

      const { data, error } = await supabase
        .from("document_categories")
        .insert({ name: trimmed })
        .select()
        .single();

      if (error) throw error;
      return data as DbCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria criada com sucesso");
    },
    onError: (error: any) => {
      if (error?.code === "23505" || /duplicate key value/.test(error?.message || "")) {
        toast.error("Já existe uma categoria com esse nome");
      } else {
        toast.error("Erro ao criar categoria: " + (error.message || "desconhecido"));
      }
    },
  });
}

export function useUpdateDocumentCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Nome da categoria não pode ser vazio");
      }

      const { data, error } = await supabase
        .from("document_categories")
        .update({ name: trimmed })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DbCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria atualizada com sucesso");
    },
    onError: (error: any) => {
      if (error?.code === "23505" || /duplicate key value/.test(error?.message || "")) {
        toast.error("Já existe uma categoria com esse nome");
      } else {
        toast.error("Erro ao atualizar categoria: " + (error.message || "desconhecido"));
      }
    },
  });
}

export function useDeleteDocumentCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primeiro, buscar o nome da categoria
      const { data: category, error: catError } = await supabase
        .from("document_categories")
        .select("name")
        .eq("id", id)
        .maybeSingle();

      if (catError) throw catError;
      if (!category) throw new Error("Categoria não encontrada");

      // Verificar se há documentos usando essa categoria
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("id")
        .eq("category", category.name)
        .limit(1);

      if (docsError) throw docsError;
      
      if (docs && docs.length > 0) {
        throw new Error("Não é possível remover uma categoria que possui documentos associados.");
      }

      // Deletar a categoria
      const { error } = await supabase
        .from("document_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Categoria removida com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover categoria: " + (error.message || "desconhecido"));
    },
  });
}


