import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];
type UserSubscription = Database["public"]["Tables"]["user_subscriptions"]["Row"];

// Fetch all active subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      console.log("🔍 [SUBSCRIPTIONS] Buscando planos ativos...");
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error("❌ [SUBSCRIPTIONS] Erro ao buscar planos:", error);
        throw error;
      }

      // Log dos dados retornados para debug
      if (data && data.length > 0) {
        console.log(`✅ [SUBSCRIPTIONS] ${data.length} plano(s) encontrado(s):`, 
          data.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            stripe_product_id: plan.stripe_product_id || "não configurado",
            stripe_price_id: plan.stripe_price_id || "não configurado",
            is_active: plan.is_active
          }))
        );
      } else {
        console.warn("⚠️ [SUBSCRIPTIONS] Nenhum plano ativo encontrado");
      }

      return (data || []) as SubscriptionPlan[];
    },
  });
}

// Fetch user's current subscription
export function useUserSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Create or update subscription
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      planId,
    }: {
      userId: string;
      planId: string;
    }) => {
      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { data, error } = await supabase
          .from("user_subscriptions")
          .update({
            plan_id: planId,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          })
          .eq("id", existingSub.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new subscription
        const { data, error } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Assinatura atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar assinatura: " + error.message);
    },
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Assinatura cancelada");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar assinatura: " + error.message);
    },
  });
}


