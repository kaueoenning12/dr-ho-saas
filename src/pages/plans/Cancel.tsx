import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function PlansCancel() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleTryAgain = () => {
    navigate('/plans');
  };

  const handleGoHome = () => {
    navigate('/');
  };

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
                  Pagamento Cancelado
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 max-w-4xl mx-auto w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Pagamento não foi concluído
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Não se preocupe, você pode tentar novamente a qualquer momento
              </p>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-lg px-4 py-2">
                Processo Cancelado
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Card className="border-red-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    O que aconteceu?
                  </CardTitle>
                  <CardDescription>
                    Possíveis motivos para o cancelamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Você cancelou o processo de pagamento</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Problema com o cartão de crédito</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Timeout na sessão de pagamento</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Problema de conectividade</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-cyan" />
                    Próximos passos
                  </CardTitle>
                  <CardDescription>
                    Como proceder agora
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Tente novamente com outro cartão</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Verifique os dados do cartão</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Entre em contato conosco se precisar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan rounded-full"></div>
                      <span>Explore os benefícios da assinatura</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleTryAgain}
                className="bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Tentar Novamente
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={handleGoHome}
                className="border-cyan/30 text-cyan hover:bg-cyan/5"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>

            <div className="mt-8 p-4 bg-cyan/5 rounded-lg border border-cyan/20">
              <p className="text-sm text-center text-muted-foreground">
                <strong>Precisa de ajuda?</strong> Nossa equipe está pronta para ajudar você a concluir sua assinatura.
                Entre em contato conosco através do suporte ou WhatsApp.
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}







