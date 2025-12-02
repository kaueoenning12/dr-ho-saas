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

      if (error) {
        console.error("[useCanAccessPremium] Erro ao verificar assinatura:", error);
        throw error;
      }
      
      // Se não há assinatura ativa, retorna false
      if (!data || !data.subscription_plans) {
        console.log("[useCanAccessPremium] Nenhuma assinatura ativa encontrada");
        return false;
      }

      const planName = (data.subscription_plans as any)?.name || "";
      
      // Normalizar nome do plano para comparação (case-insensitive, remover espaços extras)
      const normalizedPlanName = planName.toLowerCase().trim();
      
      // Planos gratuitos que NÃO podem acessar premium
      const freePlans = ["free", "gratuito", "plano free", "plano gratuito"];
      if (freePlans.some(freePlan => normalizedPlanName === freePlan || normalizedPlanName.includes(freePlan))) {
        console.log("[useCanAccessPremium] Plano gratuito detectado:", planName);
        return false;
      }
      
      // Planos premium conhecidos (case-insensitive)
      const premiumPlanNames = [
        "premium",
        "advanced",
        "avançado",
        "assinatura dr. ho",
        "assinatura dr ho",
        "dr. ho",
        "dr ho",
        "enterprise",
        "empresarial"
      ];
      
      // Verificar se o plano está na lista de premium OU se não é gratuito (considerar premium por padrão)
      const isPremiumPlan = premiumPlanNames.some(premiumPlan => 
        normalizedPlanName === premiumPlan || 
        normalizedPlanName.includes(premiumPlan)
      );
      
      // Se não é plano gratuito e não está na lista explícita, considerar premium por padrão
      // (assumindo que qualquer plano pago é premium)
      const result = isPremiumPlan || normalizedPlanName.length > 0;
      
      console.log("[useCanAccessPremium] Verificação:", {
        planName,
        normalizedPlanName,
        isPremiumPlan,
        result
      });
      
      return result;
    },
    enabled: !!user?.id,
  });
}
