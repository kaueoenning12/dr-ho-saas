import { useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useForumCategories, useCreateTopic } from "@/hooks/useForumQuery";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ForumNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useForumCategories();
  const createTopic = useCreateTopic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar logado para criar uma discussão");
      return;
    }

    if (!title.trim()) {
      toast.error("Digite um título para a discussão");
      return;
    }

    if (!content.trim()) {
      toast.error("Digite o conteúdo da discussão");
      return;
    }

    if (!categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    setIsSubmitting(true);

    try {
      await createTopic.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId,
        author_id: user.id,
        is_pinned: false,
        is_locked: false,
        views: 0,
      });

      toast.success("Discussão criada com sucesso!");
      navigate("/forum");
    } catch (error: any) {
      console.error("Error creating topic:", error);
      toast.error("Erro ao criar discussão: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
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
              <div className="flex-1">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">
                  Nova Discussão
                </h1>
              </div>
              <div className="shrink-0">
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
            <div className="max-w-4xl mx-auto">
              <Button
                variant="ghost"
                onClick={() => navigate("/forum")}
                className="mb-6 text-cyan hover:text-cyan/80 hover:bg-cyan/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o Fórum
              </Button>

              <Card className="border-cyan/20 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-cyan" />
                    <CardTitle className="text-2xl">Criar Nova Discussão</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título da Discussão *</Label>
                      <Input
                        id="title"
                        placeholder="Digite um título claro e descritivo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={200}
                        className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
                      />
                      <p className="text-xs text-muted-foreground">
                        {title.length}/200 caracteres
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="border-cyan/20 focus:ring-cyan/20 focus:border-cyan">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesLoading ? (
                            <SelectItem value="loading" disabled>
                              Carregando categorias...
                            </SelectItem>
                          ) : categories.length === 0 ? (
                            <SelectItem value="empty" disabled>
                              Nenhuma categoria disponível
                            </SelectItem>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Conteúdo *</Label>
                      <Textarea
                        id="content"
                        placeholder="Descreva sua dúvida, problema ou tópico de discussão em detalhes..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Seja claro e forneça o máximo de detalhes possível
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !title.trim() || !content.trim() || !categoryId}
                        className="flex-1 bg-gradient-to-r from-cyan to-blue-500 hover:from-cyan/90 hover:to-blue-500/90 text-white"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Criando...
                          </div>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Criar Discussão
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/forum")}
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-initial"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="mt-8 p-4 bg-cyan/5 border border-cyan/20 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 text-cyan">Dicas para uma boa discussão:</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use um título claro e objetivo</li>
                  <li>• Forneça contexto e detalhes suficientes</li>
                  <li>• Escolha a categoria correta</li>
                  <li>• Seja respeitoso com outros membros</li>
                  <li>• Pesquise se sua dúvida já foi respondida antes de criar uma nova discussão</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

