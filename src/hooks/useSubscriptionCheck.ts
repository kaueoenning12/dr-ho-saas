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

    // CRÍTICO: Sempre derivar status de user.subscription quando ele mudar
    // Isso garante que o hook reaja imediatamente às mudanças no AuthContext
    // CRÍTICO: Sempre derivar status de user.subscription quando ele mudar
    // Isso garante que o hook reaja imediatamente às mudanças no AuthContext
    const localStatus = deriveStatusFromUserSubscription(user.subscription);
    
    // Se temos dados de subscription do user, atualizar estado imediatamente
    // Isso garante que mudanças em user.subscription sejam refletidas imediatamente
    if (localStatus) {
      // Sempre atualizar o estado quando user.subscription mudar
      // Usar função de atualização para comparar e evitar re-renders desnecessários
      setSubscriptionCheck((prev) => {
        // Comparar valores relevantes para determinar se precisa atualizar
        const hasChanged = 
          prev.hasAccess !== localStatus.isActive ||
          prev.subscription?.status !== localStatus.status ||
          prev.subscription?.expiresAt !== localStatus.expiresAt ||
          prev.subscription?.isActive !== localStatus.isActive ||
          prev.subscription?.isExpired !== localStatus.isExpired;
        
        if (hasChanged) {
          return {
            hasAccess: localStatus.isActive,
            subscription: localStatus,
            redirectTo: localStatus.isActive ? undefined : "/plans",
          };
        }
        return prev;
      });
      setIsLoading(false);
      
      // Se temos subscription local, não precisamos fazer check adicional imediatamente
      // Mas podemos fazer um check em background para garantir sincronização
      // (apenas se não estiver em progresso e passou tempo suficiente desde último check)
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTimeRef.current;
      if (!checkInProgressRef.current && timeSinceLastCheck > 5000) {
        // Fazer check em background para garantir sincronização (não bloqueia UI)
        checkInProgressRef.current = true;
        lastCheckTimeRef.current = now;
        
        checkSubscriptionAccess(user.id)
          .then((result) => {
            if (!result.isError && result.subscription) {
              // Se o resultado do servidor for diferente, atualizar
              const serverStatus = result.subscription;
              const currentStatus = localStatus;
              
              if (
                serverStatus.isActive !== currentStatus.isActive ||
                serverStatus.status !== currentStatus.status ||
                serverStatus.expiresAt !== currentStatus.expiresAt
              ) {
                console.log('[useSubscriptionCheck] Status do servidor diferente, atualizando...', {
                  local: currentStatus,
                  server: serverStatus,
                });
                setSubscriptionCheck({
                  hasAccess: serverStatus.isActive,
                  subscription: serverStatus,
                  redirectTo: serverStatus.isActive ? undefined : "/plans",
                });
              }
            }
          })
          .catch((err) => {
            console.error('Error checking subscription in background:', err);
          })
          .finally(() => {
            checkInProgressRef.current = false;
          });
      }
      
      return; // Retornar cedo, já atualizamos com dados locais
    }

    // Se não temos dados locais, fazer check no servidor
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
        setIsLoading(false);
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

    // Fazer check se não temos dados locais
    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.subscription?.status, user?.subscription?.expires_at, user?.subscription?.plan_id, user?.subscription]);

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












