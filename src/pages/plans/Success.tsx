import { useEffect, useState } from "react";
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

export default function PlansSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!sessionId) {
      navigate('/plans');
      return;
    }

    // Refresh subscription data after webhook processes
    const refreshData = async () => {
      try {
        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh subscription data
        await refreshSubscription();
        
        // Verify subscription was created
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'active')
          .single();

        if (subscription) {
          toast.success("Assinatura ativada com sucesso!");
        } else {
          toast.info("Processando sua assinatura... Isso pode levar alguns segundos.");
        }
      } catch (error) {
        console.error('Error refreshing subscription:', error);
        toast.error("Erro ao verificar assinatura. Tente atualizar a página.");
      } finally {
        setIsLoading(false);
      }
    };

    refreshData();
  }, [isAuthenticated, sessionId, navigate, user?.id, refreshSubscription]);

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







