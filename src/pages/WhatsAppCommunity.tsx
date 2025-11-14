import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Check, Bell, Clock, Bot, Sparkles, Newspaper, Zap } from "lucide-react";
import { whatsappConfig } from "@/lib/mockData";

export default function WhatsAppCommunity() {
  const handleWhatsAppClick = () => {
    const phone = whatsappConfig.phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(whatsappConfig.welcomeMessage);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">WhatsApp Doutor HO</h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
            {/* Hero Section */}
            <div className="mb-8 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 shadow-lg">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                WhatsApp Doutor HO
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Receba notícias, tire dúvidas com nossa IA em tempo real e acesse conteúdo exclusivo direto no WhatsApp
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <Badge variant="outline" className={`${
                  whatsappConfig.isOnline 
                    ? "bg-green-500/10 text-green-600 border-green-500/30" 
                    : "bg-gray-500/10 text-gray-600 border-gray-500/30"
                }`}>
                  {whatsappConfig.isOnline ? "Online" : "Offline"}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {whatsappConfig.businessHours}
                </Badge>
              </div>

              <Button 
                size="lg"
                onClick={handleWhatsAppClick}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg px-8 py-6 h-auto shadow-lg"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Conectar no WhatsApp
              </Button>
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <Bot className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>IA em Tempo Real</CardTitle>
                  <CardDescription>
                    Tire dúvidas instantaneamente sobre riscos ocupacionais, NRs e processos com nossa inteligência artificial 24/7
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-cyan/10 flex items-center justify-center mb-4">
                    <Newspaper className="h-6 w-6 text-cyan" />
                  </div>
                  <CardTitle>Notícias e Atualizações</CardTitle>
                  <CardDescription>
                    Receba notificações sobre novos relatórios, atualizações de NRs, mudanças na legislação e notícias importantes de SST
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Conteúdo Exclusivo</CardTitle>
                  <CardDescription>
                    Acesse relatórios, materiais, dicas e checklists diretamente pelo WhatsApp de forma rápida e prática
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* How It Works Section */}
            <div className="max-w-5xl mx-auto mb-12">
              <h2 className="text-2xl font-semibold mb-6 text-center">Como Funciona</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-purple-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className="h-8 w-8 text-purple-600" />
                      <CardTitle className="text-xl">🤖 Assistente IA</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Pergunte sobre riscos ocupacionais e receba respostas instantâneas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Dúvidas sobre NRs, EPIs, processos e legislação</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Respostas baseadas na nossa base de conhecimento completa</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Disponível 24 horas por dia, 7 dias por semana</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Suporte em tempo real via WhatsApp</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Newspaper className="h-8 w-8 text-green-600" />
                      <CardTitle className="text-xl">📰 Notícias e Conteúdo</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Receba notificações de novos relatórios publicados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Alertas sobre atualizações de NRs e legislação</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Notícias importantes do mundo de SST</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Acesso rápido a relatórios e materiais exclusivos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Dicas, checklists e conteúdos práticos</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Benefits Section */}
            <Card className="max-w-5xl mx-auto border-cyan/20">
              <CardHeader>
                <CardTitle>Benefícios do WhatsApp Doutor HO:</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">IA em Tempo Real</h4>
                      <p className="text-sm text-muted-foreground">
                        Tire dúvidas instantaneamente com nossa inteligência artificial especializada
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Notícias e Atualizações</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba alertas sobre novos relatórios, atualizações de NRs e mudanças na legislação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Acesso Rápido</h4>
                      <p className="text-sm text-muted-foreground">
                        Acesse relatórios, materiais e conteúdo exclusivo diretamente pelo WhatsApp
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Conveniência</h4>
                      <p className="text-sm text-muted-foreground">
                        Tudo que você precisa de SST no aplicativo que você já usa todos os dias
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

