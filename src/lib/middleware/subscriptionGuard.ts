import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  expiresAt: string | null;
}

export interface SubscriptionCheckResult {
  hasAccess: boolean;
  subscription: SubscriptionStatus | null;
  redirectTo?: string;
  isError?: boolean;
  isMissing?: boolean;
}

/**
 * Check if user has an active subscription
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionCheckResult> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        status,
        expires_at,
        started_at,
        subscription_plans (
          id,
          name,
          price
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error retrieving subscription:', error);
      return {
        hasAccess: false,
        subscription: null,
        redirectTo: '/plans',
        isError: true,
        isMissing: true,
      };
    }

    const subscription = data?.[0];

    if (!subscription) {
      return {
        hasAccess: false,
        subscription: null,
        redirectTo: '/plans',
        isMissing: true,
      };
    }

    const normalizeStatus = (status: string | null | undefined): SubscriptionStatus["status"] => {
      switch ((status || "").toLowerCase()) {
        case 'active':
          return 'active';
        case 'trialing':
          return 'trialing';
        case 'cancelled':
        case 'canceled':
          return 'cancelled';
        case 'expired':
          return 'expired';
        case 'past_due':
          return 'past_due';
        default:
          return 'inactive';
      }
    };

    const normalizedStatus = normalizeStatus(subscription.status);
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
    const isExpired = expiresAt ? now > expiresAt : false;
    
    // Check if plan is "Free" - treat as not subscribed
    const planName = (subscription.subscription_plans as any)?.name;
    const isFreePlan = planName && planName.toLowerCase() === 'free';
    
    // User only has access if subscription is active AND not a Free plan
    const isActive = !isFreePlan && (normalizedStatus === 'active' || normalizedStatus === 'trialing') && !isExpired;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY;

    const subscriptionStatus: SubscriptionStatus = {
      isActive,
      isExpired,
      daysUntilExpiry: Number.isFinite(daysUntilExpiry) ? daysUntilExpiry : 0,
      status: normalizedStatus,
      expiresAt: subscription.expires_at,
    };

    return {
      hasAccess: isActive,
      subscription: subscriptionStatus,
      redirectTo: isActive ? undefined : '/plans',
      isMissing: false,
    };

  } catch (error) {
    console.error('Error checking subscription:', error);
    return {
      hasAccess: false,
      subscription: null,
      redirectTo: '/plans',
      isError: true,
      isMissing: true,
    };
  }
}

/**
 * Check if user has access to a specific resource
 */
export async function checkResourceAccess(
  userId: string, 
  resourceType: 'document' | 'feature' | 'admin',
  resourceId?: string
): Promise<boolean> {
  const { hasAccess } = await checkSubscriptionAccess(userId);
  
  if (!hasAccess) {
    return false;
  }

  // Additional resource-specific checks can be added here
  switch (resourceType) {
    case 'document':
      return true; // All documents accessible with active subscription
    case 'feature':
      return true; // All features accessible with active subscription
    case 'admin':
      // Admin access requires both subscription and admin role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      return userRole?.role === 'admin';
    default:
      return false;
  }
}

/**
 * Get subscription status for display purposes
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  const { subscription } = await checkSubscriptionAccess(userId);
  return subscription;
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isSubscriptionExpiringSoon(subscription: SubscriptionStatus | null): boolean {
  if (!subscription || !subscription.isActive) {
    return false;
  }
  return subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry > 0;
}

/**
 * Check if subscription is in grace period (expired but within 3 days)
 */
export function isSubscriptionInGracePeriod(subscription: SubscriptionStatus | null): boolean {
  if (!subscription || subscription.isActive) {
    return false;
  }
  return subscription.isExpired && subscription.daysUntilExpiry >= -3;
}












