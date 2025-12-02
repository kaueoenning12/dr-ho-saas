import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, User, Eye, Send, Sparkles } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useForumTopicById, 
  useTopicReplies, 
  useCreateReply,
  useIncrementTopicViews,
  useForumCategories
} from "@/hooks/useForumQuery";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function ForumTopic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: topic, isLoading: topicLoading } = useForumTopicById(id || null);
  const { data: replies = [], isLoading: repliesLoading } = useTopicReplies(id || null);
  const { data: categories = [] } = useForumCategories();
  const createReply = useCreateReply();
  const incrementViews = useIncrementTopicViews();

  // Incrementar views quando carregar
  useEffect(() => {
    if (id) {
      incrementViews.mutate(id);
    }
  }, [id]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id || !replyContent.trim()) {
      toast.error("Por favor, preencha sua resposta");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createReply.mutateAsync({
        topic_id: id,
        author_id: user.id,
        content: replyContent.trim(),
      });
      setReplyContent("");
      toast.success("Resposta adicionada com sucesso!");
    } catch (error: any) {
      console.error("Error creating reply:", error);
      toast.error("Erro ao adicionar resposta: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
    return daysDiff < 1;
  };

  if (topicLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
              <p className="text-muted-foreground">Carregando tópico...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!topic) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-4">Tópico não encontrado</p>
              <Button onClick={() => navigate("/forum")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o Fórum
              </Button>
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
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>
              <div className="flex-1">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">
                  Discussão do Fórum
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>
          
          <div className="flex-1 px-3 sm:px-6 py-4 sm:py-8 max-w-5xl mx-auto w-full">
            <Button 
              onClick={() => navigate("/forum")} 
              variant="ghost"
              className="group mb-6 text-cyan hover:text-cyan/80 hover:bg-cyan/10 transition-all duration-300 hover:translate-x-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Voltar para o Fórum
            </Button>

            {/* Tópico Principal */}
            <Card className="border-cyan/20 shadow-lg mb-8 relative animate-fade-in overflow-hidden">
              {isTopicNew(topic.created_at) && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-gradient-to-r from-cyan to-blue-500 text-white border-0 shadow-md text-[10px] px-2 py-1">
                    <Sparkles className="h-3 w-3 mr-1" />
                    NOVO
                  </Badge>
                </div>
              )}
              
              <CardHeader className="space-y-4 pb-4">
                {/* Autor Info com Avatar */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-cyan/30 shadow-lg">
                    <AvatarFallback className="bg-gradient-brand text-foreground font-semibold text-lg">
                      {getAuthorInitials((topic as any).author?.name || "Usuário")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                        {topic.title}
                      </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{(topic as any).author?.name || "Usuário"}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatTimeAgo(topic.created_at)}</span>
                      </div>
                      <span>•</span>
                      <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30 text-[10px]">
                        {getCategoryName(topic.category_id)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stats Badges */}
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-muted border-border">
                    <Eye className="h-3 w-3 mr-1" />
                    {topic.views} views
                  </Badge>
                  <Badge variant="outline" className="bg-muted border-border">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {replies.length} resposta{replies.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              
              <Separator />
              
              <CardContent className="pt-6">
                <p className="whitespace-pre-wrap text-foreground leading-relaxed text-[15px]">
                  {topic.content}
                </p>
              </CardContent>
            </Card>

            {/* Respostas */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="h-5 w-5 text-cyan" />
                <h2 className="text-xl font-semibold">
                  {replies.length} Resposta{replies.length !== 1 ? 's' : ''}
                </h2>
              </div>
              
              {repliesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando respostas...</p>
                </div>
              ) : replies.length === 0 ? (
                <Card className="border-cyan/20 animate-fade-in">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-20 w-20 bg-cyan/10 rounded-full blur-2xl" />
                      </div>
                      <MessageSquare className="h-12 w-12 text-cyan/40 mx-auto relative animate-float" />
                    </div>
                    <p className="text-muted-foreground text-[15px]">Nenhuma resposta ainda. Seja o primeiro a responder!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {replies.map((reply, index) => {
                    const authorName = (reply as any).author?.name || "Usuário";
                    return (
                    <Card 
                      key={reply.id} 
                      className="group border-cyan/20 hover:border-cyan/40 hover:shadow-lg transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10 border-2 border-cyan/20 group-hover:border-cyan/50 transition-all duration-300 group-hover:scale-105">
                            <AvatarFallback className="bg-gradient-brand text-foreground font-semibold text-sm">
                              {getAuthorInitials(authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(reply.created_at)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-foreground leading-relaxed mt-2 text-[14px] sm:text-[15px]">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formulário de Resposta */}
            <Card className="border-cyan/20 shadow-lg animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-cyan" />
                  Adicionar Resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReply} className="space-y-4">
                  <div className="relative group">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Digite sua resposta... Seja respeitoso e contribua para a discussão."
                      rows={6}
                      className="border-cyan/20 input-glow transition-all duration-300 focus:rows-8 resize-none"
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                      {replyContent.length}/2000
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {user?.name && `Respondendo como ${user.name}`}
                    </p>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !replyContent.trim()}
                      className="group bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:translate-x-1" />
                          Enviar Resposta
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

