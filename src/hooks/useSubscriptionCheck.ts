import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscriptionAccess, SubscriptionStatus, SubscriptionCheckResult } from '@/lib/middleware/subscriptionGuard';

export function useSubscriptionCheck() {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionCheck, setSubscriptionCheck] = useState<SubscriptionCheckResult>({
    hasAccess: true,
    subscription: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deriveStatusFromUserSubscription = (subscription: NonNullable<typeof user>["subscription"]): SubscriptionStatus | null => {
    if (!subscription) {
      return null;
    }

    const normalizeStatus = (status: string | null | undefined): SubscriptionStatus["status"] => {
      switch ((status || "").toLowerCase()) {
        case "active":
          return "active";
        case "trialing":
          return "trialing";
        case "cancelled":
        case "canceled":
          return "cancelled";
        case "expired":
          return "expired";
        case "past_due":
          return "past_due";
        default:
          return "inactive";
      }
    };

    const normalizedStatus = normalizeStatus(subscription.status);
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
    const isExpired = expiresAt ? now > expiresAt : false;
    
    // Check if plan is "Free" - treat as not subscribed
    const planName = (subscription as any).subscription_plans?.name;
    const isFreePlan = planName && planName.toLowerCase() === 'free';
    
    // User only has access if subscription is active AND not a Free plan
    const isActive = !isFreePlan && (normalizedStatus === "active" || normalizedStatus === "trialing") && !isExpired;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      isActive,
      isExpired,
      daysUntilExpiry,
      status: normalizedStatus,
      expiresAt: subscription.expires_at,
    };
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscriptionCheck({
        hasAccess: false,
        subscription: null,
      });
      setIsLoading(false);
      return;
    }

    const localStatus = deriveStatusFromUserSubscription(user.subscription);
    if (localStatus) {
      setSubscriptionCheck({
        hasAccess: localStatus.isActive,
        subscription: localStatus,
        redirectTo: localStatus.isActive ? undefined : "/plans",
      });
      if (localStatus.isActive) {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
    }

    let cancelled = false;

    const checkSubscription = async () => {
      try {
        if (!localStatus?.isActive) {
          setIsLoading(true);
        }
        setError(null);
        
        const result = await checkSubscriptionAccess(user.id);
        if (cancelled) return;
        if (result.isError) {
          setError('Erro ao verificar assinatura');
          setSubscriptionCheck((prev) => ({
            ...prev,
            redirectTo: prev.hasAccess ? prev.redirectTo : undefined,
          }));
        } else {
          setSubscriptionCheck((prev) => {
            if (result.isMissing && prev.hasAccess) {
              return {
                ...prev,
                subscription: result.subscription ?? prev.subscription,
              };
            }
            return result;
          });
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        if (cancelled) return;
        setError('Erro ao verificar assinatura');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.subscription]);

  return {
    ...subscriptionCheck,
    isLoading,
    error,
    refetch: () => {
      if (user) {
        setIsLoading(true);
        checkSubscriptionAccess(user.id)
          .then((result) => {
            setSubscriptionCheck((prev) => {
              if (result.isError) {
                setError('Erro ao verificar assinatura');
                return prev;
              }
              if (result.isMissing && prev.hasAccess) {
                return {
                  ...prev,
                  subscription: result.subscription ?? prev.subscription,
                };
              }
              return result;
            });
          })
          .catch((err) => {
            console.error('Error refetching subscription:', err);
            setError('Erro ao verificar assinatura');
          })
          .finally(() => setIsLoading(false));
      }
    },
  };
}

export function useSubscriptionStatus() {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        setIsLoading(true);
        const result = await checkSubscriptionAccess(user.id);
        if (result.isError) {
          setSubscription(null);
        } else {
          setSubscription(result.subscription);
        }
      } catch (err) {
        console.error('Error checking subscription status:', err);
        setSubscription(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [isAuthenticated, user?.id]);

  return {
    subscription,
    isLoading,
  };
}












