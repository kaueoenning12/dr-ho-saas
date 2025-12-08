import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StripeConfig {
  id: string;
  environment: 'test' | 'live';
  publishable_key: string;
  secret_key: string;
  webhook_secret: string | null;
  default_product_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch active Stripe configuration
export function useStripeConfig() {
  return useQuery({
    queryKey: ["stripe-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as StripeConfig | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
    refetchOnWindowFocus: false,
  });
}

// Fetch all Stripe configurations (for admin)
export function useStripeConfigs() {
  return useQuery({
    queryKey: ["stripe-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_config")
        .select("*")
        .order("environment", { ascending: true });

      if (error) throw error;
      return (data || []) as StripeConfig[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Update Stripe configuration
export function useUpdateStripeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StripeConfig> }) => {
      console.log("🔄 [STRIPE CONFIG] Atualizando configuração:", { id, updates });
      const { data, error } = await supabase
        .from("stripe_config")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ [STRIPE CONFIG] Erro ao atualizar:", error);
        throw new Error(error.message || "Erro ao atualizar configuração. Verifique se você tem permissões de administrador.");
      }
      
      console.log("✅ [STRIPE CONFIG] Configuração atualizada:", data);
      return data as StripeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-config"] });
      queryClient.invalidateQueries({ queryKey: ["stripe-configs"] });
      toast.success("Configuração do Stripe atualizada com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Erro ao atualizar configuração. Por favor, tente novamente.";
      console.error("❌ [STRIPE CONFIG] Erro na mutation:", error);
      toast.error(errorMessage);
    },
  });
}

// Create Stripe configuration
export function useCreateStripeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<StripeConfig, "id" | "created_at" | "updated_at">) => {
      console.log("➕ [STRIPE CONFIG] Criando nova configuração:", config.environment);
      const { data, error } = await supabase
        .from("stripe_config")
        .insert(config)
        .select()
        .single();

      if (error) {
        console.error("❌ [STRIPE CONFIG] Erro ao criar:", error);
        throw new Error(error.message || "Erro ao criar configuração. Verifique se você tem permissões de administrador.");
      }
      
      console.log("✅ [STRIPE CONFIG] Configuração criada:", data);
      return data as StripeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-config"] });
      queryClient.invalidateQueries({ queryKey: ["stripe-configs"] });
      toast.success("Configuração do Stripe criada com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Erro ao criar configuração. Por favor, tente novamente.";
      console.error("❌ [STRIPE CONFIG] Erro na mutation:", error);
      toast.error(errorMessage);
    },
  });
}

