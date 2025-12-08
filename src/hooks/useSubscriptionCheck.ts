import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscriptionAccess, SubscriptionStatus, SubscriptionCheckResult } from '@/lib/middleware/subscriptionGuard';

export function useSubscriptionCheck() {
  const { user, isAuthenticated } = useAuth();
  
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

  // OTIMIZAÇÃO: Inicializar estado baseado em user.subscription se disponível
  const getInitialState = (): { check: SubscriptionCheckResult; loading: boolean } => {
    if (!user || !isAuthenticated) {
      return {
        check: { hasAccess: false, subscription: null },
        loading: false,
      };
    }
    
    // Se temos subscription no user, derivar status inicial
    const localStatus = deriveStatusFromUserSubscription(user.subscription);
    if (localStatus) {
      return {
        check: {
          hasAccess: localStatus.isActive,
          subscription: localStatus,
          redirectTo: localStatus.isActive ? undefined : "/plans",
        },
        loading: false, // Já temos dados, não precisa carregar
      };
    }
    
    // Sem subscription, mas temos user - aguardar check
    return {
      check: { hasAccess: true, subscription: null }, // Otimista: assumir acesso até verificar
      loading: true,
    };
  };

  const initialState = getInitialState();
  const [subscriptionCheck, setSubscriptionCheck] = useState<SubscriptionCheckResult>(initialState.check);
  const [isLoading, setIsLoading] = useState(initialState.loading);
  const [error, setError] = useState<string | null>(null);
  const checkInProgressRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscriptionCheck({
        hasAccess: false,
        subscription: null,
      });
      setIsLoading(false);
      return;
    }

    // GUARD: Não fazer check se user ainda não tem dados completos (ainda carregando)
    // Isso previne mostrar "sem plano" enquanto dados estão carregando
    if (!user.id || !user.role) {
      // User ainda está carregando, manter estado atual (otimista)
      return;
    }

    const localStatus = deriveStatusFromUserSubscription(user.subscription);
    
    // OTIMIZAÇÃO: Se temos dados de subscription do user, usar diretamente sem fazer check adicional
    if (localStatus) {
      setSubscriptionCheck({
        hasAccess: localStatus.isActive,
        subscription: localStatus,
        redirectTo: localStatus.isActive ? undefined : "/plans",
      });
      setIsLoading(false); // Não precisamos fazer check adicional se já temos dados
      return; // Retornar cedo, não fazer check desnecessário
    }

    // Só fazer check se realmente não temos dados de subscription
    // Mas manter hasAccess: true (otimista) enquanto carrega para não mostrar "sem plano" incorretamente
    setIsLoading(true);
    let cancelled = false;

    const checkSubscription = async () => {
      // Prevent multiple simultaneous checks
      if (checkInProgressRef.current) {
        return;
      }

      // Debounce: don't check more than once every 2 seconds
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTimeRef.current;
      if (timeSinceLastCheck < 2000) {
        return;
      }

      checkInProgressRef.current = true;
      lastCheckTimeRef.current = now;

      try {
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
        checkInProgressRef.current = false;
      }
    };

    // Fazer check apenas se não temos dados locais
    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.subscription?.status, user?.subscription?.expires_at]);

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












