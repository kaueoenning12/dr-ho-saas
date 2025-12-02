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
import { Plus, Lightbulb, CheckCircle2, XCircle, Clock, Loader } from "lucide-react";
import { ContentSuggestion } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSuggestions, useCreateSuggestion, useUpdateSuggestion } from "@/hooks/useSuggestionsQuery";

export default function Suggestions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: suggestions = [], isLoading } = useSuggestions(user?.id, isAdmin);
  const createSuggestion = useCreateSuggestion();
  const updateSuggestion = useUpdateSuggestion();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ContentSuggestion | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createSuggestion.mutate({
      ...formData,
      suggested_by_id: user?.id || "",
    });

    handleCloseDialog();
  };

  const handleUpdateStatus = (id: string, status: "approved" | "rejected" | "in_progress") => {
    updateSuggestion.mutate({
      id,
      updates: {
        status,
        admin_response: adminResponse || null,
      },
    });
    
    setResponseDialogOpen(false);
    setSelectedSuggestion(null);
    setAdminResponse("");
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      title: "",
      description: "",
      category: "",
      priority: "medium",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="text-[11px] font-medium bg-green-500/10 text-green-700 border border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="text-[11px] font-medium bg-red-500/10 text-red-700 border border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitada
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="text-[11px] font-medium bg-blue-500/10 text-blue-700 border border-blue-200">
            <Loader className="h-3 w-3 mr-1" />
            Em Andamento
          </Badge>
        );
      default:
        return (
          <Badge className="text-[11px] font-medium bg-yellow-500/10 text-yellow-700 border border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high": return "Alta";
      case "medium": return "Média";
      case "low": return "Baixa";
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-700 border-red-200";
      case "medium": return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-500/10 text-green-700 border-green-200";
      default: return "bg-muted text-foreground border-border";
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
                <h1 className="text-[16px] sm:text-[20px] font-semibold tracking-tight text-foreground truncate">
                  Sugestões de Conteúdo
                </h1>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="group bg-gradient-brand hover:opacity-90 text-foreground shadow-cyan h-10 px-4 rounded-xl font-medium text-[14px] transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95">
                      <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                      Nova Sugestão
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="text-foreground text-[18px]">Sugerir Novo Conteúdo</DialogTitle>
                      <DialogDescription className="text-muted-foreground text-[14px]">
                        Sugira documentos, materiais ou conteúdos que você gostaria de ver na plataforma
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-foreground font-medium">Título</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Ex: NR-35 - Trabalho em Altura"
                          className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-foreground font-medium">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Descreva o conteúdo sugerido e por que seria útil"
                          rows={4}
                          className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-foreground font-medium">Categoria</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="Ex: Normas Regulamentadoras"
                            className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority" className="text-foreground font-medium">Prioridade</Label>
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
                      <Button variant="ghost" onClick={handleCloseDialog} className="text-foreground/70 hover:text-foreground">
                        Cancelar
                      </Button>
                      <Button onClick={handleSubmit} className="bg-gradient-brand hover:opacity-90 text-foreground">
                        Enviar Sugestão
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="px-3 sm:px-6 py-4 sm:py-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-foreground">
                Sugestões da Comunidade
              </h2>
              <p className="text-muted-foreground mt-1 text-[13px] sm:text-[14px] font-light">
                {suggestions.length} sugestão{suggestions.length !== 1 ? "ões" : ""} enviada{suggestions.length !== 1 ? "s" : ""}
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Carregando sugestões...</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                {suggestions.map((suggestion, index) => (
                <Card
                  key={suggestion.id}
                  className={`group border border-cyan/10 shadow-elegant hover:shadow-cyan hover:border-cyan/30 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 animate-reveal-up shimmer-effect`}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                    willChange: 'transform',
                  }}
                >
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:bg-cyan/20">
                          <Lightbulb className="h-5 w-5 text-cyan transition-transform duration-300 group-hover:rotate-12" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-[15px] sm:text-[16px] font-semibold text-foreground">
                            {suggestion.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getStatusBadge(suggestion.status)}
                            <Badge className={`text-[11px] font-medium border ${getPriorityColor(suggestion.priority)}`}>
                              {getPriorityLabel(suggestion.priority)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 py-4 sm:py-5 space-y-3">
                    <div>
                      <p className="text-[13px] sm:text-[14px] text-foreground/80 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-cyan/10">
                      <div className="space-y-0.5">
                        <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                          Categoria: <span className="font-medium text-foreground/70">{suggestion.category}</span>
                        </p>
                        <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                          Sugerido por: <span className="font-medium text-foreground/70">{(suggestion as any).author?.name || "Usuário"}</span>
                        </p>
                        <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                          {new Date(suggestion.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {user?.role === "admin" && suggestion.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSuggestion(suggestion as any);
                              setResponseDialogOpen(true);
                            }}
                            className="h-8 px-3 text-[12px] text-foreground/70 hover:text-foreground hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95"
                          >
                            Responder
                          </Button>
                        </div>
                      )}
                    </div>
                    {suggestion.admin_response && (
                      <div className="mt-3 p-3 rounded-lg bg-cyan/5 border border-cyan/10">
                        <p className="text-[11px] font-medium text-cyan mb-1">Resposta do Administrador</p>
                        <p className="text-[12px] sm:text-[13px] text-foreground/70">
                          {suggestion.admin_response}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))}

                {suggestions.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <Lightbulb className="h-16 w-16 mx-auto text-cyan/30 mb-4" />
                  <p className="text-muted-foreground text-[15px] font-light">Nenhuma sugestão enviada ainda</p>
                  <p className="text-muted-foreground/60 text-[13px] font-light mt-2">
                    Seja o primeiro a sugerir um novo conteúdo
                  </p>
                </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Admin Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground text-[18px]">Responder Sugestão</DialogTitle>
            <DialogDescription className="text-muted-foreground text-[14px]">
              {selectedSuggestion?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="response" className="text-foreground font-medium">Resposta (Opcional)</Label>
              <Textarea
                id="response"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Deixe um comentário para o usuário"
                rows={3}
                className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => selectedSuggestion && handleUpdateStatus(selectedSuggestion.id, "rejected")}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              variant="ghost"
              onClick={() => selectedSuggestion && handleUpdateStatus(selectedSuggestion.id, "in_progress")}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Loader className="h-4 w-4 mr-2" />
              Em Andamento
            </Button>
            <Button
              onClick={() => selectedSuggestion && handleUpdateStatus(selectedSuggestion.id, "approved")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
