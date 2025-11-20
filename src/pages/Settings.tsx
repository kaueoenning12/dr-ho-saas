import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { hasValidPaidSubscription } from "@/lib/utils/subscription";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doutorHOPlan } from "@/lib/mockData";
import { daysUntil, formatDateBR } from "@/lib/utils";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  
  const currentPlan = user?.subscription?.plan_id === doutorHOPlan.id ? doutorHOPlan : null;
  const daysRemaining = user?.subscription?.expires_at ? daysUntil(user.subscription.expires_at) : 0;

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

          <div className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-full sm:max-w-4xl">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full sm:w-auto grid-cols-2 mb-6">
                <TabsTrigger value="account">Conta</TabsTrigger>
                <TabsTrigger value="plan">Plano</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="mt-0">
                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                    <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">Informações da Conta</CardTitle>
                    <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                      Seus dados de perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 sm:space-y-6 px-4 sm:px-6 py-5 sm:py-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-[12px] sm:text-[13px] font-medium text-navy/70">Nome</p>
                      <p className="text-[14px] sm:text-[15px] font-normal text-navy">{user?.name}</p>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-[12px] sm:text-[13px] font-medium text-navy/70">Email</p>
                      <p className="text-[14px] sm:text-[15px] font-normal text-navy break-all">{user?.email}</p>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-[12px] sm:text-[13px] font-medium text-navy/70">Tipo de Conta</p>
                      <Badge
                        variant={user?.role === "admin" ? "default" : "secondary"}
                        className={`text-[11px] sm:text-[12px] font-semibold px-2.5 sm:px-3 py-1 ${
                          user?.role === "admin"
                            ? "bg-navy text-white hover:bg-navy/90 border-0 shadow-sm"
                            : "bg-aqua/20 text-navy hover:bg-aqua/30 border-0"
                        }`}
                      >
                        {user?.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="mt-0">
                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                    <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">Meu Plano</CardTitle>
                    <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                      Gerencie sua assinatura
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
                    {user?.subscription ? (
                      <div className="space-y-6">
                        {/* Plan Details */}
                        <div className="p-4 rounded-lg bg-gradient-to-r from-cyan/10 via-cyan/5 to-transparent border border-cyan/20">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-5 w-5 text-cyan" />
                                <h3 className="text-lg font-semibold text-navy">{currentPlan?.name}</h3>
                              </div>
                              <p className="text-2xl font-bold text-navy">
                                R$ {currentPlan?.priceYearly.toFixed(2)}
                                <span className="text-sm font-normal text-navy/60"> /ano</span>
                              </p>
                              <p className="text-sm text-navy/60 mt-1">
                                ou 12x R$ {currentPlan?.priceMonthly.toFixed(2)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`${
                                hasValidPaidSubscription(user?.subscription)
                                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                                  : "bg-red-500/10 text-red-600 border-red-500/30"
                              }`}
                            >
                              {hasValidPaidSubscription(user?.subscription) ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-navy/70">Início da assinatura:</span>
                              <span className="font-medium text-navy">{formatDateBR(user.subscription.started_at)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-navy/70">Próxima renovação:</span>
                              <span className="font-medium text-navy">{formatDateBR(user.subscription.expires_at)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-navy/70">Dias restantes:</span>
                              <span className="font-medium text-cyan">{daysRemaining > 0 ? daysRemaining : 0} dias</span>
                            </div>
                          </div>
                        </div>

                        {/* Plan Features */}
                        <div>
                          <h4 className="text-sm font-medium text-navy/70 mb-3">Recursos do seu plano:</h4>
                          <ul className="space-y-2">
                            {currentPlan?.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-navy/80">
                                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-cyan shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-border/50">
                          <Button
                            onClick={() => navigate("/plans")}
                            className="w-full sm:w-auto bg-cyan hover:bg-cyan/90 text-primary-foreground"
                          >
                            Ver todos os planos
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-navy/60 mb-4">Você ainda não possui um plano ativo</p>
                        <Button onClick={() => navigate("/plans")} className="bg-cyan hover:bg-cyan/90 text-primary-foreground">
                          Escolher um plano
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
