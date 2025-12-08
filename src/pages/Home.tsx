import { useMemo, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { HomeAnnouncements } from "@/components/HomeAnnouncements";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { News } from "@/components/News";
import { useRecentDocuments, useUserDocumentLikesBatch } from "@/hooks/useDocumentsQuery";
import { useHomeAnnouncements } from "@/hooks/useHomeAnnouncementsQuery";
import { useEvents } from "@/hooks/useEventsQuery";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationList } from "@/components/layout/NotificationList";
import { useUnreadCount } from "@/hooks/useNotificationsQuery";
import type { Database } from "@/integrations/supabase/types";

type Document = Database["public"]["Tables"]["documents"]["Row"];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  
  // OTIMIZAÇÃO: Usar hook otimizado que busca apenas 6 documentos do banco
  // ao invés de buscar todos e filtrar no cliente
  const { data: recentDocuments = [], isLoading: documentsLoading } = useRecentDocuments(6);

  // Batch fetch user likes
  const documentIds = useMemo(() => recentDocuments.map(doc => doc.id), [recentDocuments]);
  const { data: userLikedDocuments = new Set<string>() } = useUserDocumentLikesBatch(
    documentIds,
    user?.id
  );

  // Buscar avisos da Home
  const { data: homeAnnouncements = [], isLoading: announcementsLoading } = useHomeAnnouncements();

  // Buscar eventos
  const { data: events = [], isLoading: eventsLoading } = useEvents();

  // Buscar contagem de notificações não lidas
  const { data: unreadCount = 0 } = useUnreadCount();

  // Exibir diálogo de notificações automaticamente se houver notificações não lidas
  useEffect(() => {
    if (!user || typeof window === "undefined") {
      return;
    }

    // Only show dialog if there are unread notifications
    if (unreadCount > 0) {
      const sessionKey = `notificationDialogSeen:${user.id}`;
      const hasSeenDialog = sessionStorage.getItem(sessionKey);

      if (!hasSeenDialog) {
        setNotificationDialogOpen(true);
        sessionStorage.setItem(sessionKey, "true");
      }
    }
  }, [user, unreadCount]);

  const handleOpenDocument = (document: Document) => {
    navigate(`/documents/${document.id}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-6 py-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
                <h1 className="text-[16px] sm:text-[20px] font-semibold tracking-tight text-foreground truncate">
                  Home
                </h1>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="px-3 sm:px-6 py-4 sm:py-8">
            {/* Avisos da Home */}
            {!announcementsLoading && homeAnnouncements.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-foreground mb-4">
                  Avisos
                </h2>
                <HomeAnnouncements announcements={homeAnnouncements} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Conteúdos Recentes - Ocupa 2 colunas no desktop */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-foreground">
                      Relatórios Recentes
                    </h2>
                    <p className="text-muted-foreground mt-1 text-[13px] sm:text-[14px] font-light">
                      {recentDocuments.length} relatório{recentDocuments.length !== 1 ? "s" : ""} mais recente{recentDocuments.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/documents")}
                    className="text-cyan hover:text-cyan/80"
                  >
                    Ver todos
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {documentsLoading ? (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground">Carregando relatórios...</p>
                  </div>
                ) : recentDocuments.length > 0 ? (
                  <div className="border border-cyan/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-cyan/5">
                            <TableHead className="w-[50px]">Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="hidden md:table-cell">Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentDocuments.map((document) => (
                            <TableRow
                              key={document.id}
                              className="cursor-pointer hover:bg-cyan/5 transition-colors"
                              onClick={() => handleOpenDocument(document)}
                            >
                              <TableCell>
                                <div className="h-10 w-10 rounded-xl bg-cyan/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-cyan" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-[14px] sm:text-[15px] text-foreground">
                                    {document.title}
                                  </p>
                                  <p className="text-[12px] sm:text-[13px] text-muted-foreground line-clamp-1 mt-0.5 sm:hidden">
                                    {document.category}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30">
                                  {document.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground text-[13px]">
                                {new Date(document.published_at || document.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDocument(document);
                                  }}
                                  className="text-cyan hover:text-cyan/80 hover:bg-cyan/10"
                                >
                                  Abrir
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-[15px] font-light">
                      Nenhum relatório encontrado
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar - Novidades e Próximos Eventos - Ocupa 1 coluna no desktop */}
              <div className="lg:col-span-1 space-y-6">
                <News />
                {!eventsLoading && (
                  <UpcomingEvents events={events} />
                )}
              </div>
            </div>
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

