import { useState } from "react";
import { Check, X, Shield, CreditCard } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { daysUntil, formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionsQuery";
import { redirectToCheckout } from "@/lib/stripe/client";
import { invokeStripeFunction } from "@/lib/stripe/edgeFunctionHelper";
import { hasValidPaidSubscription } from "@/lib/utils/subscription";

export default function Plans() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();

  // Separar planos gratuitos de pagos
  const freePlan = plans.find(p => p.price === 0);
  const paidPlans = plans.filter(p => p.price > 0);
  const primaryPlan = paidPlans[0]; // Usar o primeiro plano pago (DR HO - PREMIUM)
  
  // Verificar se tem assinatura paga válida (não Free)
  // Plano Free = sem assinatura válida
  const hasActivePlan = hasValidPaidSubscription(user?.subscription);
  const daysRemaining = user?.subscription?.expires_at ? daysUntil(user.subscription.expires_at) : 0;
  
  // Verificar se o usuário tem plano Free
  const FREE_PLAN_ID = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';
  const subscriptionPlanId = user?.subscription?.plan_id ? String(user.subscription.plan_id) : null;
  
  // Verificar se é Free plan apenas pelo ID (mais confiável)
  const isFreePlan = subscriptionPlanId === FREE_PLAN_ID || 
                     (subscriptionPlanId && String(subscriptionPlanId).toLowerCase() === String(FREE_PLAN_ID).toLowerCase());
  
  // Verificar se o usuário já tem o mesmo plano ativo
  const isSamePlan = subscriptionPlanId && primaryPlan?.id && subscriptionPlanId === primaryPlan.id;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
  
  // Permitir checkout se:
  // - Tem plano Free (sempre permitir)
  // - Não tem assinatura ativa
  // - Tem assinatura mas é plano diferente (upgrade/downgrade)
  // - Tem assinatura mas está expirando em menos de 30 dias (renovação antecipada)
  const canSubscribe = isFreePlan || !hasActivePlan || !isSamePlan || isExpiringSoon;

  // Helper function para parsear features de forma segura
  const parseFeatures = (features: string | null | undefined): string[] => {
    if (!features) return [];
    
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [features];
    } catch {
      // Trata como texto simples
      if (features.includes('\n')) {
        return features.split('\n').map(f => f.trim()).filter(Boolean);
      } else if (features.includes(',')) {
        return features.split(',').map(f => f.trim()).filter(Boolean);
      } else {
        return [features];
      }
    }
  };

  // Loading state
  if (plansLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
              <p className="text-muted-foreground">Carregando planos...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // No plan available state
  if (!primaryPlan) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const handleSubscribe = async () => {
    if (!user || !primaryPlan) return;

    // Validação: Bloquear checkout de planos gratuitos
    if (!primaryPlan || primaryPlan.price <= 0) {
      toast.error("Não é possível processar pagamento para plano gratuito");
      console.error('[Plans] Tentativa de checkout para plano gratuito:', primaryPlan);
      return;
    }

    // Verificar se pode assinar
    if (!canSubscribe) {
      if (isSamePlan && !isExpiringSoon) {
        toast.info("Você já possui uma assinatura ativa para este plano. Acesse a página de cobrança para gerenciar sua assinatura.");
      } else {
        toast.info("Você já possui uma assinatura ativa!");
      }
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar se temos os dados necessários
      if (!primaryPlan?.id) {
        throw new Error('Plano não encontrado');
      }
      
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Call Supabase Edge Function to create checkout session
      // A função invokeStripeFunction automaticamente adiciona as chaves do Stripe do .env
      const data = await invokeStripeFunction('create-checkout-session', {
        planId: primaryPlan.id,
        userId: user.id,
      });

      if (data?.url) {
        // Use the full checkout URL (preferred - includes all necessary parameters)
        console.log('[Plans] Redirecionando para checkout usando URL completa da sessão');
        await redirectToCheckout(data.url);
      } else if (data?.sessionId) {
        // Fallback: use sessionId if URL is not available
        console.log('[Plans] URL não disponível, usando sessionId como fallback');
        await redirectToCheckout(data.sessionId);
      } else {
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      const errorMessage = error.message || error.originalError?.message || "Erro ao processar pagamento";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-6 py-2 sm:py-2.5 md:py-3">
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">Planos e Assinatura</h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-7xl mx-auto w-full">
            {/* Current Plan Status */}
            {hasActivePlan && user?.subscription && (
              <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-cyan/10 via-cyan/5 to-transparent border border-cyan/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30">
                        Plano Atual
                      </Badge>
                      {hasValidPaidSubscription(user?.subscription) && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {primaryPlan?.name || "Plano Ativo"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {user.subscription.expires_at && (
                        <>
                          Renovação em {formatDateBR(user.subscription.expires_at)} 
                          {daysRemaining > 0 && ` (${daysRemaining} dias)`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    {primaryPlan && (
                      <>
                        <div className="text-3xl font-bold text-foreground">
                          R$ {primaryPlan.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">por ano</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção Sem vs Com Doutor HO */}
            <div className="mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
                Por que escolher o Doutor HO?
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Sem Doutor HO */}
                <Card className="border-red-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <X className="h-6 w-6 text-red-500" />
                      <CardTitle className="text-xl">SEM DOUTOR HO</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span>Você fica inseguro e perdido na hora de identificar riscos ocupacionais</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span>Identifica riscos da forma errada</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span>Perde horas de trabalho</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span>Busca informações nos lugares errados</span>
                      </li>
                    </ul>
                    <div className="pt-4 border-t">
                      <p className="font-semibold mb-2 text-red-600">Resultado:</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Se sente inseguro para definir quais riscos ocupacionais existem</li>
                        <li>• Não sabe o que levar em consideração na hora de elaborar documentos para SST</li>
                        <li>• Corre risco de ter o CREA cassado por não identificar o risco corretamente</li>
                        <li>• Fica no prejuízo porque não fez o serviço</li>
                        <li>• Deixa os trabalhadores em risco</li>
                        <li>• Profissional que não sabe o que está fazendo</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Com Doutor HO */}
                <Card className="border-green-500/20 ring-2 ring-green-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-6 w-6 text-green-600" />
                      <CardTitle className="text-xl">COM DOUTOR HO</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Tem acesso a relatórios sobre os riscos em um só lugar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Com apenas alguns cliques já acessa relatórios simples e detalhados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Fica seguro na hora de descobrir os riscos em qualquer ambiente</span>
                      </li>
                    </ul>
                    <div className="pt-4 border-t">
                      <p className="font-semibold mb-2 text-green-600">Resultado:</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Sabe identificar e reconhecer riscos ocupacionais da maneira certa</li>
                        <li>• Tem segurança para tomar decisões</li>
                        <li>• Profissional valorizado pelo mercado de SST</li>
                        <li>• Se torna autoridade</li>
                        <li>• Aumento da renda porque sabe identificar os riscos para SST</li>
                        <li>• Sabe o que levar em consideração na hora de elaborar laudos</li>
                        <li>• Deixa os trabalhadores seguros</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Card do Plano Único */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Plano Anual Doutor HO</h2>
                <p className="text-muted-foreground">Acesso Completo a Todos os Relatórios</p>
              </div>

              <Card className="border-cyan/50 shadow-cyan/10 shadow-xl relative hover:shadow-cyan/20 hover:scale-[1.02] transition-all duration-500 animate-fade-in-up">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse">
                  {primaryPlan && (
                    <Badge className="bg-gradient-to-r from-cyan to-blue-500 text-white border-0 px-4 py-1 shadow-lg">
                      Menos de R$ {(primaryPlan.price / 365).toFixed(2)} por dia!
                    </Badge>
                  )}
                </div>

                <CardHeader className="text-center pt-8">
                  <div className="mb-4">
                    <div className="text-5xl font-bold text-cyan mb-2">
                      R$ {primaryPlan?.price.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-muted-foreground">
                      por ano ou <span className="font-semibold text-cyan">12x R$ {primaryPlan ? (primaryPlan.price / 12).toFixed(2) : "0.00"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <Shield className="h-3 w-3 mr-1" />
                      Garantia de 7 dias
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                      Acesso imediato
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                      Sem contrato
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6">
                  <ul className="space-y-3">
                    {primaryPlan?.features && parseFeatures(String(primaryPlan.features)).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-cyan shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 px-6 pb-6">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan/30 active:scale-95 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canSubscribe || isLoading}
                    onClick={handleSubscribe}
                  >
                    {canSubscribe && !isLoading && (
                      <div className="absolute inset-0 shimmer opacity-50" />
                    )}
                    {isLoading ? (
                      <div className="flex items-center gap-2 relative z-10 text-white">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redirecionando para pagamento...
                      </div>
                    ) : !canSubscribe ? (
                      <span className="relative z-10 text-white">
                        {isSamePlan && !isExpiringSoon 
                          ? "Você já está assinante deste plano!" 
                          : "Você já está assinante!"}
                      </span>
                    ) : isExpiringSoon ? (
                      <div className="flex items-center gap-2 relative z-10 text-white">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-semibold">RENOVAR ASSINATURA</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 relative z-10 text-white">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-semibold">ASSINAR COM STRIPE</span>
                      </div>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Pagamento seguro via Stripe • Renovação automática anual • Cancele quando quiser
                  </p>
                </CardFooter>
              </Card>
            </div>

            {/* FAQ */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center">Perguntas Frequentes</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    Não sei identificar riscos ocupacionais, como o Doutor HO pode me ajudar?
                  </AccordionTrigger>
                  <AccordionContent>
                    No Doutor HO, você terá acesso a relatórios técnicos sobre os riscos ocupacionais com informações fáceis e detalhadas sobre diferentes processos, que vão te ajudar a descobrir os riscos químicos, físicos e biológicos em qualquer ambiente de trabalho. Você vai acessar os relatórios em forma de texto para tomar as melhores decisões.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    Durante quanto tempo terei acesso ao Doutor HO?
                  </AccordionTrigger>
                  <AccordionContent>
                    A assinatura é válida pelo período de 1 ano.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    Como vou acessar os relatórios de riscos?
                  </AccordionTrigger>
                  <AccordionContent>
                    Os relatórios são disponibilizados em uma ferramenta própria. Ao finalizar a compra você receberá um e-mail com um link para efetuar seu cadastro e definir a sua senha.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">
                    Os relatórios de riscos vão me informar se preciso medir um agente químico?
                  </AccordionTrigger>
                  <AccordionContent>
                    Os relatórios de riscos são um diferencial para o seu reconhecimento de riscos. Trazem direcionamento e clareza na identificação de riscos nos mais diferentes processos. Mas não é possível saber se é preciso medir um agente químico. Os relatórios facilitam suas tomadas de decisões, sem eliminar o trabalho do Higienista Ocupacional.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">
                    E se eu assinar o Doutor HO e não gostar?
                  </AccordionTrigger>
                  <AccordionContent>
                    Depois da compra, você tem 7 dias de garantia incondicional. Se por algum motivo você achar que o Doutor HO não atendeu suas expectativas, pode solicitar o reembolso e ter o seu dinheiro de volta.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">
                    Posso acessar os relatórios de riscos pelo celular?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sim, o Doutor HO pode ser acessado por qualquer dispositivo que possui acesso à internet. Isso inclui celular, tablet, desktop, laptop e Smart TV.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger className="text-left">
                    Como faço para tirar minhas dúvidas?
                  </AccordionTrigger>
                  <AccordionContent>
                    Todos os relatórios têm um campo de comentários para você colocar as suas dúvidas, assim o nosso Time te responde em até 1 dia útil.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger className="text-left">
                    E se o Doutor HO não tiver o processo que eu preciso?
                  </AccordionTrigger>
                  <AccordionContent>
                    O Doutor HO será constantemente atualizado, e a cada quinze dias teremos novos relatórios de riscos disponíveis. Se o processo que você precisa não estiver disponível, como assinante, você pode solicitar um estudo de caso/tema que daremos prioridade na elaboração do relatório de risco.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-9">
                  <AccordionTrigger className="text-left">
                    Quais são as formas de pagamento?
                  </AccordionTrigger>
                  <AccordionContent>
                    Trabalhamos com cartão de crédito e PIX através do Stripe, garantindo máxima segurança e facilidade no pagamento.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-10">
                  <AccordionTrigger className="text-left">
                    Quando os relatórios serão liberados?
                  </AccordionTrigger>
                  <AccordionContent>
                    Já temos relatórios de riscos prontos, mas os próximos serão liberados de forma quinzenal dentro da plataforma do Doutor HO.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-11">
                  <AccordionTrigger className="text-left">
                    Eu sou aluno do MHOF, eu preciso do Doutor HO?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sim, pois são soluções diferentes e que se complementam. O Método HO Fácil é um treinamento completo, eu cubro somente alguns processos. Já no Doutor HO, você vai receber relatórios de riscos com informações detalhadas sobre vários processos, complementando o MHOF.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-12">
                  <AccordionTrigger className="text-left">
                    Eu sou assinante do HO Fácil WEB, eu preciso do Doutor HO?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sim, pois são soluções diferentes e que se complementam. O Doutor HO contém todas as informações necessárias para você lançar dentro do WEB, e saber se tem enquadramento de riscos para insalubridade e aposentadoria especial.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-13">
                  <AccordionTrigger className="text-left">
                    O Doutor HO tem certificado?
                  </AccordionTrigger>
                  <AccordionContent>
                    Não, porque o Doutor HO não é um curso. É uma ferramenta/plataforma com vários relatórios de riscos com informações detalhadas de vários processos.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-14">
                  <AccordionTrigger className="text-left">
                    Posso assinar depois?
                  </AccordionTrigger>
                  <AccordionContent>
                    Poder até pode, mas o banco de relatórios vai aumentar e o preço também. Não assine agora e amanhã fique perdido no ambiente de trabalho pensando "Por que não assinei antes?". Aproveita que ainda custa pouco mais de R$ 1,00 por dia.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
