import { useState, useEffect } from "react";
import { CreditCard, Calendar, Download, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionCheck";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateBR, daysUntil } from "@/lib/utils";
import { invokeStripeFunction } from "@/lib/stripe/edgeFunctionHelper";

interface BillingData {
  subscription: any;
  invoices: any[];
  paymentMethod: any;
}

export default function Billing() {
  const { user } = useAuth();
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get user subscription with plan details
      const { data: userSub } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .single();

      setBillingData({
        subscription: userSub,
        invoices: [], // TODO: Implement invoice fetching from Stripe
        paymentMethod: null, // TODO: Implement payment method fetching
      });
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Erro ao carregar dados de cobrança');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    if (!user) return;

    try {
      setIsOpeningPortal(true);
      
      const data = await invokeStripeFunction('create-customer-portal', {
        userId: user.id,
        returnUrl: window.location.origin + '/billing',
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não encontrada');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Erro ao abrir portal do cliente');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading || subscriptionLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
              <p className="text-muted-foreground">Carregando dados de cobrança...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const currentPlan = billingData?.subscription?.subscription_plans;
  const isActive = subscription?.isActive;
  const daysRemaining = subscription?.daysUntilExpiry || 0;

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
                  Cobrança e Assinatura
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-6xl mx-auto w-full">
            {/* Current Subscription Status */}
            <div className="mb-8">
              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-cyan" />
                        Assinatura Atual
                      </CardTitle>
                      <CardDescription>
                        Gerencie sua assinatura e método de pagamento
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        isActive 
                          ? "bg-green-500/10 text-green-600 border-green-500/30"
                          : "bg-red-500/10 text-red-600 border-red-500/30"
                      }
                    >
                      {isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentPlan && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{currentPlan.name}</h3>
                        <p className="text-2xl font-bold text-cyan mb-1">
                          R$ {currentPlan.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">por ano</p>
                        
                        {subscription?.expiresAt && (
                          <div className="mt-4 p-3 bg-cyan/5 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-cyan" />
                              <span className="text-sm font-medium">Próxima cobrança</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDateBR(subscription.expiresAt)}
                              {daysRemaining > 0 && ` (${daysRemaining} dias)`}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <Button
                          onClick={handleOpenCustomerPortal}
                          disabled={isOpeningPortal}
                          className="w-full bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white"
                        >
                          {isOpeningPortal ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Abrindo portal...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Gerenciar Assinatura
                            </div>
                          )}
                        </Button>
                        
                        <p className="text-xs text-center text-muted-foreground">
                          Atualizar cartão, ver faturas, cancelar assinatura
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <Card className="border-cyan/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-cyan" />
                    Método de Pagamento
                  </CardTitle>
                  <CardDescription>
                    Informações do seu método de pagamento atual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-cyan/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-sm text-muted-foreground">
                          Gerenciado pelo Stripe
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCustomerPortal}
                      disabled={isOpeningPortal}
                    >
                      Atualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing History */}
            <div className="mb-8">
              <Card className="border-cyan/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-cyan" />
                    Histórico de Cobrança
                  </CardTitle>
                  <CardDescription>
                    Suas faturas e pagamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan/10 rounded-full mb-4">
                      <Download className="h-6 w-6 text-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Histórico de Cobrança</h3>
                    <p className="text-muted-foreground mb-4">
                      Acesse o portal do cliente para ver todas as suas faturas e downloads
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleOpenCustomerPortal}
                      disabled={isOpeningPortal}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Histórico Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Important Information */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                    Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Renovação automática anual</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Cancele a qualquer momento</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Sem taxas de cancelamento</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Garantia de 7 dias</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    Precisa de Ajuda?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Nossa equipe está pronta para ajudar com qualquer dúvida sobre cobrança ou assinatura.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Contatar Suporte
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}







