import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, FileText } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeStripeFunction } from "@/lib/stripe/edgeFunctionHelper";

// ID do plano premium
const PREMIUM_PLAN_ID = 'cb2078ac-1741-4a7b-afc1-48cbf05efd5c';

export default function PlansSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const hasProcessedRef = useRef(false);
  const toastShownRef = useRef(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Evitar múltiplas execuções
    if (hasProcessedRef.current) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!sessionId) {
      navigate('/plans');
      return;
    }

    if (!user?.id) {
      return;
    }

    // Marcar como processado imediatamente
    hasProcessedRef.current = true;

    // Função para buscar subscription com retry
    const fetchSubscriptionWithRetry = async (retries = 5, delay = 2000): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Success] Tentativa ${i + 1}/${retries} de buscar subscription...`);
          
          const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select(`
              *,
              subscription_plans (
                id,
                name,
                price
              )
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (error) {
            console.error(`[Success] Erro ao buscar subscription (tentativa ${i + 1}):`, error);
            throw error;
          }

          if (subscription) {
            console.log('[Success] Subscription encontrada:', {
              planId: subscription.plan_id,
              planName: subscription.subscription_plans?.name,
              status: subscription.status,
            });
            return subscription;
          }

          // Se não encontrou e ainda há tentativas, aguardar antes de tentar novamente
          if (i < retries - 1) {
            console.log(`[Success] Subscription não encontrada, aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Aumentar delay progressivamente
            delay = Math.min(delay * 1.5, 5000);
          }
        } catch (error) {
          console.error(`[Success] Erro na tentativa ${i + 1}:`, error);
          if (i === retries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 5000);
        }
      }

      return null;
    };

    // Função para verificar permissões RLS
    const checkRLSPermissions = async (): Promise<{ canRead: boolean; canUpdate: boolean; error?: any }> => {
      try {
        if (!user?.id) {
          return { canRead: false, canUpdate: false };
        }

        // Verificar se consegue ler
        const { data: readData, error: readError } = await supabase
          .from('user_subscriptions')
          .select('id, plan_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const canRead = !readError && readData !== null;

        // Se não consegue ler, não consegue atualizar
        if (!canRead) {
          console.warn('[Success] RLS: Não é possível ler subscription. Erro:', readError);
          return { canRead: false, canUpdate: false, error: readError };
        }

        // Verificar se há uma policy de UPDATE verificando se conseguimos fazer um update de teste
        // Usando o mesmo plan_id para não alterar dados reais
        const currentPlanId = readData?.plan_id;
        if (currentPlanId) {
          // Tentar fazer um update de teste (sem realmente mudar nada)
          // Isso verifica se a RLS policy de UPDATE está funcionando
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ plan_id: currentPlanId })
            .eq('user_id', user.id)
            .select('id'); // Select apenas id para minimizar dados retornados

          const canUpdate = !updateError;
          if (updateError) {
            console.warn('[Success] RLS: Não é possível atualizar subscription. Erro:', {
              code: updateError.code,
              message: updateError.message,
              hint: updateError.hint,
            });
            return { canRead: true, canUpdate: false, error: updateError };
          }

          return { canRead: true, canUpdate: true };
        }

        // Se não há subscription ainda, assumir que pode criar (será verificado no INSERT)
        return { canRead: true, canUpdate: true };
      } catch (error) {
        console.error('[Success] Erro ao verificar permissões RLS:', error);
        return { canRead: false, canUpdate: false, error };
      }
    };

    // Função para atualizar plan_id diretamente via Supabase client (último fallback)
    const updatePlanIdDirectly = async (planId: string, retryCount = 0, maxRetries = 2): Promise<boolean> => {
      try {
        console.log(`[Success] Tentando atualizar plan_id diretamente via Supabase client (tentativa ${retryCount + 1}/${maxRetries + 1})...`, { planId, userId: user?.id });
        
        if (!user?.id) {
          console.error('[Success] User ID não disponível para atualização direta');
          return false;
        }

        // Verificar permissões RLS primeiro
        const permissions = await checkRLSPermissions();
        if (!permissions.canRead) {
          console.error('[Success] RLS: Não é possível ler subscription. Verifique se a RLS policy "Users can view their own subscription" está ativa.');
          return false;
        }
        if (!permissions.canUpdate) {
          console.error('[Success] RLS: Não é possível atualizar subscription. Verifique se a RLS policy "Users can update their own subscription" está ativa. Erro:', permissions.error);
          if (permissions.error?.code === '42501' || permissions.error?.message?.includes('permission denied')) {
            console.error('[Success] Erro de permissão RLS detectado. A migration pode não ter sido executada.');
          }
          return false;
        }

        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({ plan_id: planId })
          .eq('user_id', user.id)
          .select('id, plan_id, status, updated_at');

        if (error) {
          console.error('[Success] Erro ao atualizar diretamente:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: error,
          });

          // Se for erro de RLS, não tentar novamente
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            console.error('[Success] Erro de permissão RLS. A migration pode não ter sido executada. Verifique DEPLOY_INSTRUCTIONS.md');
            return false;
          }

          // Se não for erro de RLS e ainda temos tentativas, tentar novamente
          if (retryCount < maxRetries) {
            const delay = 1000 * (retryCount + 1); // Delay progressivo: 1s, 2s
            console.log(`[Success] Aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return updatePlanIdDirectly(planId, retryCount + 1, maxRetries);
          }

          return false;
        }

        if (data && data.length > 0) {
          const updated = data[0];
          console.log('[Success] Plan_id atualizado diretamente com sucesso:', {
            planId: updated.plan_id,
            expectedPlanId: planId,
            status: updated.status,
            updatedAt: updated.updated_at,
            match: updated.plan_id === planId,
          });

          // Verificar se realmente foi atualizado
          if (updated.plan_id === planId) {
            return true;
          } else {
            console.warn('[Success] Plan_id atualizado mas não corresponde ao esperado:', {
              expected: planId,
              actual: updated.plan_id,
            });
            return false;
          }
        }

        console.warn('[Success] Update retornou sucesso mas sem dados');
        return false;
      } catch (error: any) {
        console.error('[Success] Erro ao atualizar diretamente (catch):', {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        return false;
      }
    };

    // Função para atualizar plan_id diretamente (agora com RLS policy de UPDATE)
    // Esta é a única função necessária após FASE 1 da correção
    const updatePlanIdViaDirectUpdate = async (planId: string): Promise<boolean> => {
      console.log('[Success] Tentando atualizar plan_id diretamente via Supabase client com RLS...', { planId, userId: user?.id });
      return await updatePlanIdDirectly(planId);
    };

    // Função para atualizar plan_id manualmente usando a Edge Function
    const updateSubscriptionPlanManually = async (sessionId: string): Promise<boolean> => {
      try {
        console.log('[Success] Tentando atualizar plan_id manualmente via Edge Function...');
        
        const result = await invokeStripeFunction('update-subscription-plan', {
          sessionId: sessionId,
        });

        if (result?.success && result?.subscription) {
          console.log('[Success] Plan_id atualizado manualmente com sucesso:', {
            planId: result.planId,
            planName: result.planName,
          });
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Success] Erro ao atualizar plan_id manualmente via Edge Function:', error);
        // Se Edge Function falhar, tentar update direto com RLS
        console.log('[Success] Tentando fallback direto via Supabase client...');
        return await updatePlanIdViaDirectUpdate(PREMIUM_PLAN_ID);
      }
    };

    // Refresh subscription data after webhook processes
    const refreshData = async () => {
      try {
        // Aguardar um pouco para o webhook processar
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Primeiro, tentar atualizar manualmente usando a Edge Function
        // Isso garante que o plan_id seja atualizado mesmo se o webhook falhar
        if (sessionId) {
          const manualUpdateSuccess = await updateSubscriptionPlanManually(sessionId);
          if (manualUpdateSuccess) {
            console.log('[Success] Atualização manual bem-sucedida, aguardando um pouco antes de buscar...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Refresh subscription data no contexto
        await refreshSubscription();
        
        // Buscar subscription com retry
        const subscription = await fetchSubscriptionWithRetry();

        if (subscription) {
          // Verificar se é o plano premium
          const isPremium = subscription.plan_id === PREMIUM_PLAN_ID;
          
          console.log('[Success] Subscription verificada:', {
            planId: subscription.plan_id,
            isPremium,
            planName: subscription.subscription_plans?.name,
          });

          // Se ainda não é premium, tentar atualizar manualmente mais uma vez
          if (!isPremium) {
            console.log('[Success] Subscription ainda não é premium, tentando atualizar...');
            
            // Primeiro tentar via Edge Function se tiver sessionId
            let retrySuccess = false;
            if (sessionId) {
              retrySuccess = await updateSubscriptionPlanManually(sessionId);
            }
            
            // Se Edge Function falhou ou não temos sessionId, tentar update direto com RLS
            if (!retrySuccess) {
              console.log('[Success] Tentando atualizar plan_id diretamente com RLS...');
              retrySuccess = await updatePlanIdViaDirectUpdate(PREMIUM_PLAN_ID);
            }
            
            if (retrySuccess) {
              // Aguardar e buscar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
              await refreshSubscription();
              const retrySubscription = await fetchSubscriptionWithRetry();
              
              if (retrySubscription?.plan_id === PREMIUM_PLAN_ID) {
                console.log('[Success] Plan_id atualizado com sucesso após retry!');
                if (!toastShownRef.current) {
                  toast.success("Assinatura premium ativada com sucesso!");
                  toastShownRef.current = true;
                }
                setIsLoading(false);
                return;
              }
            }
          }

          // Mostrar toast apenas uma vez
          if (!toastShownRef.current) {
            if (isPremium) {
              toast.success("Assinatura premium ativada com sucesso!");
            } else {
              toast.warning("Assinatura ativada, mas o plano pode não ter sido atualizado corretamente. Por favor, atualize a página.");
            }
            toastShownRef.current = true;
          }
        } else {
          // Se não encontrou após todas as tentativas, tentar atualizar manualmente
          console.log('[Success] Subscription não encontrada, tentando atualizar manualmente...');
          
          // Tentar via Edge Function primeiro se tiver sessionId
          let manualUpdateSuccess = false;
          if (sessionId) {
            manualUpdateSuccess = await updateSubscriptionPlanManually(sessionId);
          }
          
          // Se Edge Function falhou ou não temos sessionId, tentar update direto com RLS
          if (!manualUpdateSuccess) {
            console.log('[Success] Tentando atualizar plan_id diretamente com RLS...');
            manualUpdateSuccess = await updatePlanIdViaDirectUpdate(PREMIUM_PLAN_ID);
          }
          
          if (manualUpdateSuccess) {
            await refreshSubscription();
            const finalSubscription = await fetchSubscriptionWithRetry();
            if (finalSubscription) {
              const isPremium = finalSubscription.plan_id === PREMIUM_PLAN_ID;
              if (!toastShownRef.current) {
                if (isPremium) {
                  toast.success("Assinatura premium ativada com sucesso!");
                } else {
                  toast.success("Assinatura ativada com sucesso!");
                }
                toastShownRef.current = true;
              }
              setIsLoading(false);
              return;
            }
          }

          // Se não encontrou após todas as tentativas
          if (!toastShownRef.current) {
            toast.info("Processando sua assinatura... Isso pode levar alguns segundos. Atualize a página se necessário.");
            toastShownRef.current = true;
          }
        }
      } catch (error) {
        console.error('[Success] Erro ao verificar subscription:', error);
        if (!toastShownRef.current) {
          toast.error("Erro ao verificar assinatura. Tente atualizar a página.");
          toastShownRef.current = true;
        }
      } finally {
        setIsLoading(false);
      }
    };

    refreshData();
  }, [isAuthenticated, sessionId, navigate, user?.id]); // Removido refreshSubscription das dependências

  const handleGoToDocuments = () => {
    navigate('/');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
              <p className="text-muted-foreground">Processando sua assinatura...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-6 py-2 sm:py-2.5">
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">
                  Assinatura Confirmada
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-4xl mx-auto w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Parabéns! Sua assinatura foi ativada
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Agora você tem acesso completo a todos os relatórios do Doutor HO
              </p>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-lg px-4 py-2">
                Assinatura Ativa
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Card className="border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    O que você ganha agora
                  </CardTitle>
                  <CardDescription>
                    Acesso completo à plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Relatórios de riscos ocupacionais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Atualizações quinzenais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Suporte técnico especializado</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Comunidade exclusiva</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-cyan" />
                    Próximos passos
                  </CardTitle>
                  <CardDescription>
                    Comece a explorar a plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Explore os relatórios disponíveis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Configure suas preferências</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Participe da comunidade</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Receba notificações de novos conteúdos</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleGoToDocuments}
                className="bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white"
              >
                <FileText className="h-5 w-5 mr-2" />
                Ver Relatórios
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={handleGoToSettings}
                className="border-cyan/30 text-cyan hover:bg-cyan/5"
              >
                Gerenciar Assinatura
              </Button>
            </div>

            <div className="mt-8 p-4 bg-cyan/5 rounded-lg border border-cyan/20">
              <p className="text-sm text-center text-muted-foreground">
                <strong>Dica:</strong> Você receberá um e-mail de confirmação em breve com todos os detalhes da sua assinatura.
                Se tiver alguma dúvida, entre em contato conosco através do suporte.
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}







