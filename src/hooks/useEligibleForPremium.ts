import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEligibleForPremium() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["eligible-for-premium", user?.id],
    queryFn: async () => {
      if (!user) {
        return { isEligible: false, currentPlan: null };
      }

      // Check user's active subscription
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (error || !subscription) {
        return { isEligible: false, currentPlan: null };
      }

      // Premium and Advanced plans are eligible (not Basic)
      const eligiblePlans = ["premium", "advanced"];
      const isEligible = eligiblePlans.includes(subscription.plan_id.toLowerCase());

      return {
        isEligible,
        currentPlan: subscription.plan_id,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

