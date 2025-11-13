import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { DocumentCard } from "@/components/DocumentCard";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/mockData";
import { useDocuments } from "@/hooks/useDocumentsQuery";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationList } from "@/components/layout/NotificationList";

type Document = Database["public"]["Tables"]["documents"]["Row"];

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: documents = [], isLoading } = useDocuments({
    category: selectedCategory,
    searchTerm: searchTerm,
    showOnlyNew: showOnlyNew,
  });

  const titleReveal = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      return;
    }

    const sessionKey = `notificationDialogSeen:${user.id}`;
    const hasSeenDialog = sessionStorage.getItem(sessionKey);

    if (!hasSeenDialog) {
      setNotificationDialogOpen(true);
      sessionStorage.setItem(sessionKey, "true");
    }
  }, [user]);

  const handleOpenDocument = (document: Document) => {
    navigate(`/documents/${document.id}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            {/* Linha superior - busca e perfil */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-6 py-2 sm:py-2.5">
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              
              {/* Input ocupa espaço disponível sem max-width em mobile */}
              <div className="flex-1 sm:max-w-xl sm:mx-auto">
                <div className="relative group/search">
                  <Search className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-cyan stroke-[2] transition-all duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-cyan" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-7 sm:pl-8 pr-2 sm:pr-3 h-8 sm:h-9 w-full text-xs sm:text-sm font-normal text-foreground border-cyan/20 rounded-lg input-glow shadow-sm transition-all duration-300 bg-background/80 backdrop-blur-sm hover:bg-background hover:border-cyan/40 hover:scale-[1.01] placeholder:text-foreground/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <UserProfileMenu />
            </div>
            
            {/* Categorias com scroll otimizado */}
            <div className="px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 pt-1 border-t border-cyan/10">
              <div className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
                <Button
                  variant={showOnlyNew ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyNew(!showOnlyNew);
                    if (!showOnlyNew) {
                      setSelectedCategory("Todas");
                    }
                  }}
                  className={`group shrink-0 whitespace-nowrap rounded-md text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 h-7 sm:h-8 transition-all duration-300 hover:scale-105 active:scale-95 ${
                    showOnlyNew
                      ? "bg-gradient-to-r from-cyan to-blue-500 text-white hover:from-cyan/90 hover:to-blue-500/90 shadow-md hover:shadow-lg"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Sparkles className={`h-3 sm:h-3.5 w-3 sm:w-3.5 mr-0.5 sm:mr-1 transition-transform duration-300 ${showOnlyNew ? 'animate-pulse' : 'group-hover:rotate-12'}`} />
                  <span>Novo</span>
                </Button>
                <div className="w-px h-6 sm:h-8 bg-border/50 shrink-0" />
                {categories.map((category, index) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowOnlyNew(false);
                    }}
                    className={`shrink-0 whitespace-nowrap rounded-md text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 h-7 sm:h-8 transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in ${
                      selectedCategory === category
                        ? "bg-cyan/15 text-cyan hover:bg-cyan/25 shadow-sm border-b-2 border-cyan"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted"
                    }`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
            <div 
              ref={titleReveal.elementRef}
              className={`mb-4 sm:mb-6 md:mb-8 scroll-reveal scroll-reveal-up ${titleReveal.isVisible ? 'is-visible' : ''}`}
            >
              <h1 className="text-xl sm:text-2xl md:text-[32px] font-semibold tracking-tight text-foreground">
                Documentos de Segurança do Trabalho
              </h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-[13px] md:text-[14px] font-light">
                {documents.length} documento{documents.length !== 1 ? "s" : ""} disponível
                {documents.length !== 1 ? "is" : ""}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Carregando documentos...</p>
              </div>
            ) : (
              <>
                {/* Grid 1 coluna mobile, 2 tablet, 3 desktop */}
                <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {documents.map((document, index) => (
                <div
                  key={document.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                    opacity: 0,
                  }}
                >
                    <DocumentCard document={{
                      id: document.id,
                      title: document.title,
                      description: document.description,
                      category: document.category,
                      keywords: document.keywords || [],
                      pdfUrl: document.pdf_url,
                      publishedAt: document.published_at,
                      views: 0,
                      likes: 0,
                      comments: 0,
                    }} onOpen={() => handleOpenDocument(document)} />
                  </div>
                ))}
              </div>

              {documents.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-[15px] font-light">Nenhum documento encontrado</p>
                  <p className="text-muted-foreground/60 text-[13px] font-light mt-2">
                    Tente ajustar seus filtros ou termos de busca
                  </p>
                </div>
              )}
            </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Notificações</DialogTitle>
          </DialogHeader>
          <NotificationList />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
