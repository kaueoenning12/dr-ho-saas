import { Link } from "react-router-dom";
import { CreditCard, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";

export function SubscriptionRequired() {
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
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">
                  Assinatura Necessária
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="max-w-2xl w-full space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan/10 rounded-full mb-6">
                  <Lock className="w-10 h-10 text-cyan" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Assinatura Necessária
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Você precisa de uma assinatura ativa para acessar este conteúdo
                </p>
              </div>

              <Card className="border-cyan/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-cyan" />
                    O que você ganha com a assinatura
                  </CardTitle>
                  <CardDescription>
                    Acesso completo a todos os recursos da plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">Acesso ilimitado a todos os relatórios de riscos ocupacionais</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">Atualizações quinzenais com novos relatórios</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">Suporte técnico especializado</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">Comunidade exclusiva de profissionais</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">Fórum para discussões e troca de experiências</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white"
                >
                  <Link to="/plans">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Ver Planos e Assinar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma assinatura?{" "}
                  <Link to="/settings" className="text-cyan hover:underline">
                    Verifique suas configurações
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

