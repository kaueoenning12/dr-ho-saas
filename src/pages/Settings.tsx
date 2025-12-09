import { useState, useEffect, useCallback, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { hasValidPaidSubscription } from "@/lib/utils/subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Mail, CheckCircle, User, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { daysUntil, formatDateBR } from "@/lib/utils";
import { useSubscriptionPlans, useUserSubscription } from "@/hooks/useSubscriptionsQuery";
import { parseFeatures } from "@/lib/utils/parseFeatures";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user, isLoading: authLoading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  
  // Fallback: usar hook para buscar subscription se AuthContext não tiver
  const { data: subscriptionFromHook, isLoading: subscriptionHookLoading } = useUserSubscription(user?.id);
  
  // Estados para edição de perfil
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Estados para redefinição de senha
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  
  // Função para formatar telefone (memoizada)
  const formatPhone = useCallback((value: string) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    
    // Se tem 13 dígitos: XX (XX) XXXXXXXXX (código país + DDD + número, sem hífen)
    // Exemplo: 5547991613291 -> 55 (47) 991613291
    if (numbers.length === 13) {
      const countryCode = numbers.substring(0, 2);
      const ddd = numbers.substring(2, 4);
      const numberPart = numbers.substring(4); // 9 dígitos restantes
      return `${countryCode} (${ddd}) ${numberPart}`;
    }
    
    // Se tem 11 dígitos: (XX) XXXXXXXXX (DDD + número, sem hífen)
    // Exemplo: 47991613291 -> (47) 991613291
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{9})/, "($1) $2");
    }
    
    // Se tem 12 dígitos: pode ser código país + DDD + número incompleto
    // Exemplo: 55479916132 -> 55 (47) 9916132
    if (numbers.length === 12) {
      const countryCode = numbers.substring(0, 2);
      const ddd = numbers.substring(2, 4);
      const numberPart = numbers.substring(4);
      return `${countryCode} (${ddd}) ${numberPart}`;
    }
    
    // Se tem 10 dígitos: (XX) XXXX-XXXX (fixo, com hífen)
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    
    // Se tem menos de 10 dígitos, retornar sem formatação completa
    if (numbers.length > 0 && numbers.length < 10) {
      return numbers;
    }
    
    // Se tem mais de 13 dígitos, formatar os primeiros 13
    if (numbers.length > 13) {
      const first13 = numbers.substring(0, 13);
      const countryCode = first13.substring(0, 2);
      const ddd = first13.substring(2, 4);
      const numberPart = first13.substring(4);
      const rest = numbers.substring(13);
      return rest ? `${countryCode} (${ddd}) ${numberPart} ${rest}` : `${countryCode} (${ddd}) ${numberPart}`;
    }
    
    return "";
  }, []);
  
  // Função helper para obter telefone formatado (sempre remove formatação antes de formatar)
  const getFormattedPhone = useCallback((phoneValue?: string | null) => {
    if (!phoneValue) return "";
    const numbersOnly = phoneValue.replace(/\D/g, "");
    if (!numbersOnly) return "";
    return formatPhone(numbersOnly);
  }, [formatPhone]);
  
  // Atualizar estados quando user mudar
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      // Formatar o telefone ao carregar usando helper
      const formatted = getFormattedPhone(user.number);
      console.log('[Settings] Carregando telefone:', {
        original: user.number,
        formatted: formatted,
        length: user.number ? user.number.replace(/\D/g, "").length : 0
      });
      setPhone(formatted);
    }
  }, [user, getFormattedPhone]);
  
  // Mostrar loading enquanto auth está carregando
  if (authLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
              <p className="text-muted-foreground">Carregando configurações...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }
  
  // Verificar se tem subscription - usar fallback do hook se AuthContext não tiver
  const subscription = user?.subscription || subscriptionFromHook || null;
  
  // Buscar o plano atual - usar subscription do hook se disponível
  const subscriptionPlanId = subscription?.plan_id;
  const currentPlan = subscriptionPlanId && plans.length > 0
    ? plans.find(p => p.id === subscriptionPlanId) 
    : null;
  
  // Tentar obter nome e preço do plano relacionado (vem da query com join)
  // Usar subscription do hook se disponível, senão usar do user
  const subscriptionWithPlan = (subscriptionFromHook || user?.subscription) as any;
  const relatedPlanName = subscriptionWithPlan?.subscription_plans?.name;
  const relatedPlanPrice = subscriptionWithPlan?.subscription_plans?.price;
  
  // Determinar nome e preço do plano
  const subscriptionPlanName = currentPlan?.name || relatedPlanName || (subscription ? "Plano Ativo" : null);
  const subscriptionPrice = currentPlan?.price || relatedPlanPrice || 0;
  
  // Função helper para verificar se tem subscription de forma robusta
  // Considerar tanto subscription do AuthContext quanto do hook
  const hasSubscription = useMemo(() => {
    const sub = subscription; // Usar subscription que já considera fallback
    if (!sub) return false;
    
    // Verificar se não é null/undefined
    if (sub === null || sub === undefined) return false;
    
    // Verificar se é um objeto válido (não é array, string, etc)
    if (typeof sub !== 'object') return false;
    
    // Verificar se é array (não deve ser)
    if (Array.isArray(sub)) return false;
    
    // Verificar se tem pelo menos uma propriedade válida
    const hasId = !!sub.id;
    const hasPlanId = 'plan_id' in sub; // Mesmo que seja null
    const hasStatus = !!sub.status;
    const hasUserId = !!sub.user_id;
    const hasStartedAt = !!sub.started_at;
    
    // Se tem pelo menos uma dessas propriedades, tem subscription
    const hasAnyProperty = hasId || hasPlanId || hasStatus || hasUserId || hasStartedAt;
    
    // Verificar se não é um objeto vazio
    const hasKeys = Object.keys(sub).length > 0;
    
    return hasAnyProperty && hasKeys;
  }, [subscription]);
  
  // Verificação melhorada: usar função helper
  const hasAnyPlanData = hasSubscription;
  
  // Debug: log para verificar subscription
  useEffect(() => {
    if (user) {
      const subscriptionData = user?.subscription;
      const subscriptionWithPlanData = subscriptionData as any;
      
      // Verificações detalhadas
      const sub = subscriptionData;
      const checks = {
        exists: !!sub,
        isNull: sub === null,
        isUndefined: sub === undefined,
        isObject: typeof sub === 'object' && sub !== null,
        isArray: Array.isArray(sub),
        hasId: !!sub?.id,
        hasPlanId: 'plan_id' in (sub || {}),
        hasStatus: !!sub?.status,
        hasUserId: !!sub?.user_id,
        hasStartedAt: !!sub?.started_at,
        hasKeys: sub ? Object.keys(sub).length > 0 : false,
        keys: sub ? Object.keys(sub) : [],
      };
      
      console.log('[Settings] Debug subscription - Estrutura completa:', {
        hasUser: !!user,
        hasSubscriptionRaw: !!subscriptionData,
        subscriptionFromAuthContext: subscriptionData,
        subscriptionFromHook: subscriptionFromHook,
        subscriptionFinal: subscription, // Subscription final (com fallback)
        subscriptionType: typeof subscriptionData,
        checks: checks,
        subscriptionId: subscriptionData?.id || subscriptionFromHook?.id,
        planId: subscriptionData?.plan_id || subscriptionFromHook?.plan_id,
        status: subscriptionData?.status || subscriptionFromHook?.status,
        userId: subscriptionData?.user_id || subscriptionFromHook?.user_id,
        startedAt: subscriptionData?.started_at || subscriptionFromHook?.started_at,
        expiresAt: subscriptionData?.expires_at || subscriptionFromHook?.expires_at,
        hasSubscriptionPlans: !!subscriptionWithPlanData?.subscription_plans,
        subscriptionPlansData: subscriptionWithPlanData?.subscription_plans,
        relatedPlanName: relatedPlanName,
        relatedPlanPrice: relatedPlanPrice,
        currentPlan: currentPlan?.name,
        subscriptionPlanId: subscriptionPlanId,
        subscriptionPlanName: subscriptionPlanName,
        hasSubscription: hasSubscription,
        hasAnyPlanData: hasAnyPlanData,
        willShowPlan: hasAnyPlanData,
        hasActivePlan: hasValidPaidSubscription(subscription),
        usingHookFallback: !user?.subscription && !!subscriptionFromHook
      });
      
      // Warning se subscription existe mas hasSubscription retorna false
      if (subscription && !hasSubscription) {
        console.warn('[Settings] ⚠️ Subscription existe mas hasSubscription retornou false!', {
          subscription: subscription,
          checks: checks
        });
      }
    }
  }, [user, subscriptionPlanId, subscriptionPlanName, hasAnyPlanData, hasSubscription, currentPlan, relatedPlanName, relatedPlanPrice, subscription, subscriptionFromHook]);
  
  const daysRemaining = subscription?.expires_at ? daysUntil(subscription.expires_at) : 0;
  
  // Parsear features do plano
  const planFeatures = currentPlan?.features ? parseFeatures(currentPlan.features) : [];
  const hasActivePlan = hasValidPaidSubscription(subscription);
  
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSavingProfile(true);
    try {
      const sanitizedPhone = phone.replace(/\D/g, "") || null;
      
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          number: sanitizedPhone,
        })
        .eq("user_id", user.id);
      
      if (error) {
        throw error;
      }
      
      // Atualizar também no auth metadata se necessário
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          number: sanitizedPhone,
        }
      });
      
      if (authError) {
        console.warn("Erro ao atualizar metadata do auth:", authError);
      }
      
      toast.success("Perfil atualizado com sucesso!");
      setIsEditingProfile(false);
      
      // Atualizar estado local imediatamente
      if (user) {
        // Atualizar o estado do telefone formatado
        const formatted = sanitizedPhone ? formatPhone(sanitizedPhone) : "";
        setPhone(formatted);
      }
      
      // Recarregar dados do usuário do contexto (sem reload da página)
      // Aguardar um pouco para o banco atualizar e então recarregar
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSavingProfile(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.email) {
      toast.error("Email não encontrado.");
      return;
    }

    setPasswordResetLoading(true);
    try {
      await resetPassword(user.email);
      setPasswordResetSent(true);
      toast.success("Email enviado! Verifique sua caixa de entrada para redefinir sua senha.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar email. Tente novamente mais tarde.");
    } finally {
      setPasswordResetLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-6 py-2 sm:py-2.5 md:py-3">
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">Configurações</h1>
              </div>
              <UserProfileMenu />
            </div>
          </header>

          <div className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-full sm:max-w-4xl mx-auto">
            <Card className="border border-cyan/10 shadow-elegant">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground">Informações da Conta</CardTitle>
                <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-muted-foreground">
                  Gerencie suas informações pessoais e assinatura
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
                {/* Informações do Perfil */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <User className="h-5 w-5 text-cyan" />
                      Dados Pessoais
                    </h3>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      {isEditingProfile ? (
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isSavingProfile}
                        />
                      ) : (
                        <p className="text-[14px] sm:text-[15px] font-normal text-foreground py-2 px-3 bg-muted/50 rounded-md">
                          {user?.name || "Não informado"}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <p className="text-[14px] sm:text-[15px] font-normal text-foreground py-2 px-3 bg-muted/50 rounded-md break-all">
                        {user?.email || "Não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      {isEditingProfile ? (
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            // Remover formatação para contar apenas números
                            const numbersOnly = inputValue.replace(/\D/g, "");
                            // Permitir até 15 dígitos (suporta 13 dígitos com código país + DDD + número)
                            // Sempre formatar se tiver 15 dígitos ou menos
                            if (numbersOnly.length <= 15) {
                              const formatted = formatPhone(inputValue);
                              setPhone(formatted);
                            }
                            // Se exceder 15 dígitos, não atualizar (mantém o valor anterior formatado)
                          }}
                          maxLength={25}
                          placeholder="(00) 00000-0000"
                          disabled={isSavingProfile}
                        />
                      ) : (
                        <p className="text-[14px] sm:text-[15px] font-normal text-foreground py-2 px-3 bg-muted/50 rounded-md">
                          {phone || getFormattedPhone(user?.number) || "Não informado"}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo de Conta</Label>
                      <div className="py-2">
                        <Badge
                          variant={user?.role === "admin" ? "default" : "secondary"}
                          className={`text-[11px] sm:text-[12px] font-semibold px-2.5 sm:px-3 py-1 ${
                            user?.role === "admin"
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-sm"
                              : "bg-aqua/20 dark:bg-aqua/30 text-foreground hover:bg-aqua/30 dark:hover:bg-aqua/40 border-0"
                          }`}
                        >
                          {user?.role === "admin" ? "Administrador" : "Usuário"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {isEditingProfile && (
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setName(user?.name || "");
                          // Formatar o telefone ao cancelar usando helper
                          setPhone(getFormattedPhone(user?.number));
                        }}
                        disabled={isSavingProfile}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || !name.trim()}
                        className="bg-cyan hover:bg-cyan/90 text-primary-foreground"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Informações do Plano */}
                <div className="pt-4 border-t border-border/50">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-cyan" />
                    Meu Plano
                  </h3>
                  
                  {hasAnyPlanData ? (
                    <div className="space-y-4">
                      {/* Plan Details */}
                      <div className="p-4 rounded-lg bg-gradient-to-r from-cyan/10 via-cyan/5 to-transparent border border-cyan/20">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-foreground">{subscriptionPlanName || currentPlan?.name || relatedPlanName || "Plano Ativo"}</h4>
                            </div>
                            {subscriptionPrice > 0 && (
                              <>
                                <p className="text-2xl font-bold text-foreground">
                                  R$ {subscriptionPrice.toFixed(2)}
                                  <span className="text-sm font-normal text-muted-foreground"> /ano</span>
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  ou 12x R$ {(subscriptionPrice / 12).toFixed(2)}
                                </p>
                              </>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`${
                              hasActivePlan
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : "bg-red-500/10 text-red-600 border-red-500/30"
                            }`}
                          >
                            {hasActivePlan ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        
                        {subscription && (
                          <div className="space-y-2 text-sm">
                            {subscription.started_at && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Início da assinatura:</span>
                                <span className="font-medium text-foreground">{formatDateBR(subscription.started_at)}</span>
                              </div>
                            )}
                            {subscription.expires_at && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Próxima renovação:</span>
                                  <span className="font-medium text-foreground">{formatDateBR(subscription.expires_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Dias restantes:</span>
                                  <span className="font-medium text-cyan">{daysRemaining > 0 ? daysRemaining : 0} dias</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Plan Features */}
                      {planFeatures.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-3">Recursos do seu plano:</h4>
                          <ul className="space-y-2">
                            {planFeatures.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-cyan shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2">
                        <Button
                          onClick={() => navigate("/plans")}
                          className="w-full sm:w-auto bg-cyan hover:bg-cyan/90 text-primary-foreground"
                        >
                          Ver todos os planos
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-muted-foreground mb-4">Você ainda não possui um plano ativo</p>
                      <Button onClick={() => navigate("/plans")} className="bg-cyan hover:bg-cyan/90 text-primary-foreground">
                        Escolher um plano
                      </Button>
                    </div>
                  )}
                </div>

                {/* Redefinir Senha */}
                <div className="pt-4 border-t border-border/50">
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-cyan" />
                    Redefinir Senha
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enviaremos um link de recuperação para seu email. O link expira em 1 hora.
                  </p>
                  
                  {passwordResetSent ? (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                            Email enviado com sucesso!
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              setPasswordResetSent(false);
                            }}
                          >
                            Enviar novamente
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-muted/50"
                        />
                        <p className="text-xs text-muted-foreground">
                          O link será enviado para este email
                        </p>
                      </div>
                      <Button
                        type="submit"
                        disabled={passwordResetLoading || !user?.email}
                        className="bg-cyan hover:bg-cyan/90 text-primary-foreground"
                      >
                        {passwordResetLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar link de recuperação
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
