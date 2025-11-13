import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Check, Users, Bell, HelpCircle, Clock, Bot, Sparkles } from "lucide-react";
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
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">Comunidade WhatsApp</h1>
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
                WhatsApp Doutor HO: IA + Comunidade
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Tire dúvidas com nossa IA 24/7 e conecte-se com profissionais de segurança do trabalho
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
                Abrir WhatsApp
              </Button>
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <Bot className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Assistente Virtual IA</CardTitle>
                  <CardDescription>
                    Pergunte e receba respostas instantâneas sobre riscos ocupacionais a qualquer hora do dia
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-cyan/10 flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-cyan" />
                  </div>
                  <CardTitle>Alertas Personalizados</CardTitle>
                  <CardDescription>
                    Receba notificações sobre novos relatórios, atualizações de NRs e notícias importantes
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-cyan/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Networking SST</CardTitle>
                  <CardDescription>
                    Conecte-se com outros profissionais, participe de discussões e troque experiências
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* IA + Community Explanation */}
            <div className="max-w-5xl mx-auto mb-12">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-purple-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className="h-8 w-8 text-purple-600" />
                      <CardTitle className="text-xl">🤖 IA Doutor HO</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Tire dúvidas rápidas sobre riscos ocupacionais 24/7</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Perguntas sobre NRs, EPIs e processos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Receba notificações de novos relatórios publicados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Alertas de atualizações de NRs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Notícias importantes de SST</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <span>Respostas instantâneas baseadas na base de conhecimento</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="h-8 w-8 text-green-600" />
                      <CardTitle className="text-xl">👥 Comunidade WhatsApp</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Grupos temáticos de discussão</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Networking com profissionais de SST</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Compartilhamento de casos e experiências</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Dúvidas respondidas pela comunidade</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Troca de conhecimentos práticos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span>Suporte de outros profissionais experientes</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Groups Section */}
            <div className="max-w-5xl mx-auto mb-8">
              <h2 className="text-2xl font-semibold mb-6">Grupos Disponíveis</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {whatsappConfig.groups.map((group) => (
                  <Card key={group.id} className="border-green-500/20 hover:border-green-500/40 transition-colors">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {group.description}
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full border-green-500/30 hover:bg-green-500/10"
                        onClick={() => window.open(group.link, '_blank')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Entrar no Grupo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Benefits Section */}
            <Card className="max-w-5xl mx-auto border-cyan/20">
              <CardHeader>
                <CardTitle>O que você pode fazer no WhatsApp:</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Suporte Rápido</h4>
                      <p className="text-sm text-muted-foreground">
                        Tire dúvidas urgentes com nossa equipe de especialistas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Avisos em Tempo Real</h4>
                      <p className="text-sm text-muted-foreground">
                        Seja o primeiro a saber sobre mudanças na legislação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Conteúdo Exclusivo</h4>
                      <p className="text-sm text-muted-foreground">
                        Receba materiais, dicas e checklists direto no WhatsApp
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Comunidade Ativa</h4>
                      <p className="text-sm text-muted-foreground">
                        Participe de grupos temáticos e eventos online
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

