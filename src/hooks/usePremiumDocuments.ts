import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { StarRating } from "@/types/premium";

// Hook para verificar se o usuário desbloqueou um documento premium
export function useDocumentUnlock(documentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["document-unlock", documentId, user?.id],
    queryFn: async () => {
      if (!documentId || !user?.id) return null;

      const { data, error } = await supabase
        .from("document_unlocks")
        .select("*")
        .eq("document_id", documentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!documentId && !!user?.id,
  });
}

// Hook para desbloquear documento com avaliação
export function useUnlockDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      documentId,
      rating,
    }: {
      documentId: string;
      rating: StarRating;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("document_unlocks")
        .insert({
          user_id: user.id,
          document_id: documentId,
          rating,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["document-unlock", variables.documentId],
      });
      toast.success("Documento desbloqueado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao desbloquear documento:", error);
      toast.error("Erro ao desbloquear documento. Tente novamente.");
    },
  });
}

// Hook para verificar se usuário tem plano elegível para premium
export function useCanAccessPremium() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["can-access-premium", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("plan_id, subscription_plans(name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      
      // Planos que podem acessar conteúdo premium
      const premiumPlans = ["Premium", "Advanced", "Avançado"];
      const planName = (data?.subscription_plans as any)?.name || "";
      
      return premiumPlans.includes(planName);
    },
    enabled: !!user?.id,
  });
}
