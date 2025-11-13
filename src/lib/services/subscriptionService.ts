import { supabase } from "@/integrations/supabase/client";
import { checkSubscriptionAccess } from "@/lib/middleware/subscriptionGuard";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string | string[];
  is_active: boolean;
  stripe_price_id?: string;
  stripe_product_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'past_due';
  started_at: string;
  expires_at: string | null;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_payment_intent_id?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  subscription_plans?: SubscriptionPlan;
}

export class SubscriptionService {
  /**
   * Get all active subscription plans
   */
  static async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user subscription: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const { hasAccess } = await checkSubscriptionAccess(userId);
    return hasAccess;
  }

  /**
   * Create checkout session for subscription
   */
  static async createCheckoutSession(planId: string, userId: string): Promise<{ sessionId: string; url: string }> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        planId,
        userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data?.sessionId || !data?.url) {
      throw new Error('Invalid checkout session response');
    }

    return data;
  }

  /**
   * Create customer portal session
   */
  static async createCustomerPortalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
    const { data, error } = await supabase.functions.invoke('create-customer-portal', {
      body: {
        userId,
        returnUrl: returnUrl || `${window.location.origin}/billing`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create customer portal session');
    }

    if (!data?.url) {
      throw new Error('Invalid customer portal response');
    }

    return data;
  }

  /**
   * Cancel user subscription
   */
  static async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    userId: string, 
    status: UserSubscription['status'],
    expiresAt?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (expiresAt) {
      updateData.expires_at = expiresAt;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update subscription status: ${error.message}`);
    }
  }

  /**
   * Get subscription statistics for admin
   */
  static async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    monthlyRevenue: number;
  }> {
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        status,
        subscription_plans (price)
      `);

    if (error) {
      throw new Error(`Failed to fetch subscription stats: ${error.message}`);
    }

    const stats = {
      totalSubscriptions: subscriptions?.length || 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      expiredSubscriptions: 0,
      monthlyRevenue: 0,
    };

    subscriptions?.forEach((sub: any) => {
      switch (sub.status) {
        case 'active':
          stats.activeSubscriptions++;
          stats.monthlyRevenue += (sub.subscription_plans?.price || 0) / 12;
          break;
        case 'cancelled':
          stats.cancelledSubscriptions++;
          break;
        case 'expired':
          stats.expiredSubscriptions++;
          break;
      }
    });

    return stats;
  }

  /**
   * Log subscription event for audit
   */
  static async logSubscriptionEvent(
    action: string,
    userId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase.rpc('log_audit_event', {
      p_action: action,
      p_resource_type: 'subscription',
      p_resource_id: userId,
      p_details: details,
    });

    if (error) {
      console.error('Failed to log subscription event:', error);
    }
  }
}












