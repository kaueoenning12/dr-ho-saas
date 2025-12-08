import { useState } from "react";
import { Search, MessageSquare, TrendingUp, Pin, CheckCircle, Plus, Flame, Sparkles, Layers, HelpCircle, AlertCircle, Lightbulb, X } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useForumCategories, useForumTopics } from "@/hooks/useForumQuery";

export default function Forum() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const navigate = useNavigate();

  const { data: categories = [], isLoading: categoriesLoading } = useForumCategories();
  const { data: topics = [], isLoading: topicsLoading } = useForumTopics(selectedCategory);

  const isLoading = categoriesLoading || topicsLoading;

  const filteredTopics = topics.filter((topic) => {
    if (!searchTerm) return true;
    return topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           topic.content.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Sem categoria";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Sem categoria";
  };

  const getAuthorInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isTopicNew = (createdAt: string) => {
    const daysDiff = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < 1; // Menos de 24h
  };

  const isTopicPopular = (views: number) => {
    return views >= 50;
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: Record<string, any> = {
      'Geral': Layers,
      'Dúvidas': HelpCircle,
      'Sugestões': Lightbulb,
      'Problemas': AlertCircle,
    };
    return icons[categoryName] || MessageSquare;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              <div className="flex-1 max-w-xl mx-auto">
                <div className="relative group/search">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-cyan stroke-[2] transition-all duration-300 group-focus-within/search:scale-110" />
                  <Input
                    placeholder="Buscar discussões..."
                    className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 w-full text-xs sm:text-sm font-normal border-cyan/20 rounded-lg input-glow shadow-sm transition-all duration-300 bg-background hover:bg-muted/40 dark:hover:bg-muted/60 hover:border-cyan/40 hover:scale-[1.01]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all duration-300 hover:scale-110 active:scale-95 animate-scale-in"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => navigate("/forum/new")}
                className="group bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-primary-foreground text-[11px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 shrink-0 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <Plus className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-0.5 sm:mr-1 transition-transform duration-300 group-hover:rotate-90" />
                <span className="hidden sm:inline">Nova</span>
                <span className="sm:hidden">+</span>
              </Button>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>

            <div className="flex gap-2 px-3 sm:px-6 pb-3 sm:pb-4 overflow-x-auto scrollbar-hide touch-pan-x">
              <Button
                variant={selectedCategory === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={`group whitespace-nowrap rounded-lg font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in ${
                  selectedCategory === "all"
                    ? "bg-cyan/15 text-cyan hover:bg-cyan/25 shadow-sm border-b-2 border-cyan"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                }`}
              >
                <Layers className="h-3.5 w-3.5 mr-1.5 transition-transform duration-300 group-hover:scale-110" />
                Todas
                <Badge variant="secondary" className="ml-2 bg-muted text-foreground/70 text-[10px] px-1.5 py-0">
                  {topics.length}
                </Badge>
              </Button>
              {categories.map((category, index) => {
                const CategoryIcon = getCategoryIcon(category.name);
                const categoryTopics = topics.filter(t => t.category_id === category.id);
                return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group whitespace-nowrap rounded-lg font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in ${
                    selectedCategory === category.id
                      ? "bg-cyan/15 text-cyan hover:bg-cyan/25 shadow-sm border-b-2 border-cyan"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                  }`}
                  style={{ animationDelay: `${(index + 1) * 0.05}s` }}
                >
                  <CategoryIcon className="h-3.5 w-3.5 mr-1.5 transition-transform duration-300 group-hover:scale-110" />
                  {category.name}
                  <Badge variant="secondary" className={`ml-2 text-[10px] px-1.5 py-0 ${
                    selectedCategory === category.id
                      ? "bg-cyan/20 text-cyan"
                    : "bg-muted text-foreground/70"
                  }`}>
                    {categoryTopics.length}
                  </Badge>
                </Button>
                );
              })}
            </div>
          </header>

          <div className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-foreground flex items-center gap-3">
                <MessageSquare className="h-7 w-7 text-cyan" />
                Fórum da Comunidade
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground text-[13px] sm:text-[14px] font-light">
                  {searchTerm ? (
                    <>
                      <span className="font-medium text-cyan">{filteredTopics.length}</span> resultado{filteredTopics.length !== 1 ? 's' : ''} para "{searchTerm}"
                    </>
                  ) : (
                    <>
                      {filteredTopics.length} discussão{filteredTopics.length !== 1 ? "ões" : ""} disponível{filteredTopics.length !== 1 ? "is" : ""}
                    </>
                  )}
                </p>
                {searchTerm && filteredTopics.length > 0 && (
                  <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30 text-[10px] animate-scale-in">
                    <Search className="h-2.5 w-2.5 mr-1" />
                    Buscando
                  </Badge>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border border-navy/8 animate-pulse">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted" />
                        <div className="flex-1 space-y-3">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-full" />
                          <div className="h-4 bg-muted rounded w-5/6" />
                          <div className="flex gap-2 mt-3">
                            <div className="h-6 bg-muted rounded w-20" />
                            <div className="h-6 bg-muted rounded w-24" />
                          </div>
                        </div>
                        <div className="hidden sm:block space-y-2">
                          <div className="h-16 w-20 bg-muted rounded-lg" />
                          <div className="h-16 w-20 bg-muted rounded-lg" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {filteredTopics.map((topic, index) => {
                    const authorName = (topic as any).author?.name || "Usuário";
                    const isNew = isTopicNew(topic.created_at);
                    const isPopular = isTopicPopular(topic.views);
                    
                    return (
                    <Card
                      key={topic.id}
                      className={`group border shadow-elegant hover:shadow-cyan hover:border-cyan/30 hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer shimmer-effect relative ${
                        topic.is_pinned 
                          ? 'border-cyan/30 bg-gradient-to-r from-cyan/5 to-transparent' 
                          : 'border-navy/8'
                      }`}
                      style={{ 
                        animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                        opacity: 0,
                        animation: `fade-in 0.5s ease-out ${Math.min(index * 0.05, 0.3)}s forwards`,
                        willChange: 'transform',
                      }}
                      onClick={() => navigate(`/forum/${topic.id}`)}
                    >
                      {/* Borda esquerda para tópicos pinned */}
                      {topic.is_pinned && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan to-aqua rounded-l-lg" />
                      )}

                      {/* Badges de Status */}
                      <div className="absolute top-3 right-3 flex gap-2 z-10">
                        {isNew && (
                          <Badge className="bg-gradient-to-r from-cyan to-blue-500 text-primary-foreground border-0 shadow-md text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5 sm:mr-1" />
                            NOVO
                          </Badge>
                        )}
                        {isPopular && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-primary-foreground border-0 shadow-md text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5">
                            <Flame className="h-2.5 w-2.5 mr-0.5 sm:mr-1" />
                            POPULAR
                          </Badge>
                        )}
                        {topic.is_pinned && (
                          <Badge className="bg-cyan/10 text-cyan border border-cyan/30 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5">
                            <Pin className="h-2.5 w-2.5 mr-0.5 sm:mr-1" />
                            FIXADO
                          </Badge>
                        )}
                      </div>

                      <CardContent className={`p-4 sm:p-6 ${isNew || isPopular ? 'pt-12 sm:pt-12' : ''}`}>
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Avatar do Autor */}
                          <div className="shrink-0">
                            <Avatar className={`h-10 w-10 sm:h-12 sm:w-12 border-2 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${
                              topic.is_pinned 
                                ? 'border-cyan/50 group-hover:border-cyan' 
                                : 'border-navy/20 group-hover:border-cyan/50'
                            }`}>
                              <AvatarFallback className="bg-gradient-brand text-foreground font-semibold text-sm">
                                {getAuthorInitials(authorName)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Conteúdo Principal */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] sm:text-[17px] font-semibold text-foreground group-hover:text-cyan transition-all duration-300 mb-1 pr-8">
                              {topic.title}
                            </h3>

                            <p className="text-[13px] sm:text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                              {topic.content}
                            </p>

                            {/* Categoria e Metadata */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30 text-[10px] px-2 py-0.5">
                                {getCategoryName(topic.category_id)}
                              </Badge>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{authorName}</span>
                              </span>
                              <span>•</span>
                              <span>{formatTimeAgo(topic.updated_at)}</span>
                            </div>
                          </div>

                          {/* Stats Coluna Direita */}
                          <div className="hidden sm:flex flex-col items-center gap-3 shrink-0 min-w-[80px]">
                            {/* Views */}
                            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted group-hover:bg-cyan/10 transition-all duration-300 min-w-[70px]">
                              <div className="flex items-center gap-1 text-foreground group-hover:text-cyan transition-colors">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="font-semibold text-sm">{topic.views}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">views</span>
                            </div>

                            {/* Respostas (placeholder - será implementado) */}
                            <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted group-hover:bg-cyan/10 transition-all duration-300 min-w-[70px]">
                              <div className="flex items-center gap-1 text-foreground group-hover:text-cyan transition-colors">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="font-semibold text-sm">0</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">respostas</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>

                {filteredTopics.length === 0 && (
                  <div className="text-center py-20 animate-fade-in">
                    <div className="mb-6 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 bg-cyan/10 rounded-full blur-2xl" />
                      </div>
                      <MessageSquare className="h-16 w-16 text-cyan/40 mx-auto relative animate-float" />
                    </div>
                    <h3 className="text-foreground text-lg font-semibold mb-2">Nenhuma discussão encontrada</h3>
                    <p className="text-muted-foreground text-[14px] font-light max-w-md mx-auto mb-6">
                      {searchTerm 
                        ? "Tente ajustar seus termos de busca ou explorar outras categorias"
                        : "Seja o primeiro a iniciar uma discussão nesta categoria!"
                      }
                    </p>
                    <Button 
                      onClick={() => navigate("/forum/new")}
                      className="group bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                      Criar Nova Discussão
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

