import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, AlertCircle, Info, Megaphone, TrendingUp, Trash2, Edit } from "lucide-react";
import { Announcement } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncementsQuery";

export default function Announcements() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: announcements = [], isLoading } = useAnnouncements(isAdmin);
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
    category: "info" as "news" | "update" | "alert" | "info",
    is_published: true,
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingAnnouncement) {
      updateAnnouncement.mutate({
        id: editingAnnouncement.id,
        updates: formData,
      });
    } else {
      createAnnouncement.mutate({
        ...formData,
        author_id: user?.id || "",
      });
    }

    handleCloseDialog();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      category: announcement.category,
      is_published: announcement.is_published,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este aviso?")) {
      deleteAnnouncement.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      content: "",
      priority: "medium",
      category: "info",
      is_published: true,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-700 border-red-200";
      case "medium": return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-500/10 text-green-700 border-green-200";
      default: return "bg-navy/10 text-navy border-navy/20";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "alert": return <AlertCircle className="h-5 w-5" />;
      case "news": return <Megaphone className="h-5 w-5" />;
      case "update": return <TrendingUp className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "alert": return "Alerta";
      case "news": return "Notícia";
      case "update": return "Atualização";
      default: return "Informação";
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/90 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-6 py-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
                <h1 className="text-[16px] sm:text-[20px] font-semibold tracking-tight text-navy truncate">
                  Canal de Avisos
                </h1>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {user?.role === "admin" && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-brand hover:opacity-90 text-navy shadow-cyan h-10 px-4 rounded-xl font-medium text-[14px]">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Aviso
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="text-navy text-[18px]">
                          {editingAnnouncement ? "Editar Aviso" : "Criar Novo Aviso"}
                        </DialogTitle>
                        <DialogDescription className="text-navy/60 text-[14px]">
                          Publique avisos e novidades para os usuários da plataforma
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-navy font-medium">Título</Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Digite o título do aviso"
                            className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="content" className="text-navy font-medium">Conteúdo</Label>
                          <Textarea
                            id="content"
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Digite o conteúdo do aviso"
                            rows={5}
                            className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="category" className="text-navy font-medium">Categoria</Label>
                            <Select
                              value={formData.category}
                              onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                            >
                              <SelectTrigger className="border-cyan/20 focus:ring-cyan/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="info">Informação</SelectItem>
                                <SelectItem value="news">Notícia</SelectItem>
                                <SelectItem value="update">Atualização</SelectItem>
                                <SelectItem value="alert">Alerta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="priority" className="text-navy font-medium">Prioridade</Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                            >
                              <SelectTrigger className="border-cyan/20 focus:ring-cyan/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={handleCloseDialog} className="text-navy/70 hover:text-navy">
                          Cancelar
                        </Button>
                        <Button onClick={handleSubmit} className="bg-gradient-brand hover:opacity-90 text-navy">
                          {editingAnnouncement ? "Atualizar" : "Publicar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="px-3 sm:px-6 py-4 sm:py-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-foreground">
                Avisos e Novidades
              </h2>
              <p className="text-muted-foreground mt-1 text-[13px] sm:text-[14px] font-light">
                {announcements.length} aviso{announcements.length !== 1 ? "s" : ""} publicado{announcements.length !== 1 ? "s" : ""}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Carregando avisos...</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {announcements.map((announcement: any) => (
                <Card
                  key={announcement.id}
                  className="border border-cyan/10 shadow-elegant hover:shadow-cyan hover:border-cyan/30 transition-all duration-300"
                >
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-10 w-10 rounded-lg ${getPriorityColor(announcement.priority)} flex items-center justify-center shrink-0`}>
                          {getCategoryIcon(announcement.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
                            {announcement.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-[11px] font-medium bg-cyan/10 text-cyan border-0">
                              {getCategoryLabel(announcement.category)}
                            </Badge>
                            <Badge className={`text-[11px] font-medium border ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority === "high" ? "Alta" : announcement.priority === "medium" ? "Média" : "Baixa"}
                            </Badge>
                            {!announcement.is_published && (
                              <Badge variant="secondary" className="text-[11px] font-medium bg-navy/10 text-navy border-0">
                                Rascunho
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {user?.role === "admin" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(announcement)}
                            className="h-9 w-9 text-navy/70 hover:text-navy hover:bg-navy/5"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(announcement.id)}
                            className="h-9 w-9 text-red-600/70 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
                    <p className="text-[14px] sm:text-[15px] text-navy/80 leading-relaxed whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                        <div className="flex items-center gap-2 mt-4 text-[12px] sm:text-[13px] text-navy/50">
                          <span>Admin</span>
                          <span>•</span>
                          <span>{new Date(announcement.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                  </CardContent>
                </Card>
                ))}

                {announcements.length === 0 && (
                <div className="text-center py-20">
                  <Megaphone className="h-16 w-16 mx-auto text-cyan/30 mb-4" />
                  <p className="text-muted-foreground text-[15px] font-light">Nenhum aviso publicado ainda</p>
                  {user?.role === "admin" && (
                    <p className="text-muted-foreground/60 text-[13px] font-light mt-2">
                      Clique em "Novo Aviso" para criar o primeiro aviso
                    </p>
                  )}
                </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
