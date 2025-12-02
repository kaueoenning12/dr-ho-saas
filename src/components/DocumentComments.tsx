import { useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentComments, useCreateComment } from "@/hooks/useDocumentsQuery";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DocumentCommentsProps {
  documentId: string;
}

export function DocumentComments({ documentId }: DocumentCommentsProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const { data: comments = [], isLoading } = useDocumentComments(documentId);
  const createCommentMutation = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado para comentar");
      return;
    }

    if (!commentText.trim()) {
      toast.error("O comentário não pode estar vazio");
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        documentId,
        userId: user.id,
        content: commentText.trim(),
      });
      setCommentText("");
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "agora";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minuto${minutes !== 1 ? "s" : ""} atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hora${hours !== 1 ? "s" : ""} atrás`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} dia${days !== 1 ? "s" : ""} atrás`;
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border-t border-cyan/10 bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-5 w-5 text-cyan" />
          <h2 className="text-xl font-semibold text-foreground">
            Comentários ({comments.length})
          </h2>
        </div>

        {/* Formulário de comentário */}
        {user && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                <AvatarFallback className="bg-cyan/20 text-cyan">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px] resize-none border-cyan/20 focus:border-cyan"
                  disabled={createCommentMutation.isPending}
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={createCommentMutation.isPending || !commentText.trim()}
                    className="bg-cyan hover:bg-cyan/90 text-white"
                  >
                    {createCommentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        {!user && (
          <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-cyan/10">
            <p className="text-sm text-muted-foreground text-center">
              Faça login para comentar
            </p>
          </div>
        )}

        {/* Lista de comentários */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => {
              const profile = comment.profiles;
              const isOwnComment = user?.id === comment.user_id;
              
              return (
                <div
                  key={comment.id}
                  className="flex gap-3 p-4 rounded-lg border border-cyan/10 bg-card hover:border-cyan/20 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                    <AvatarFallback className="bg-cyan/20 text-cyan">
                      {profile?.name ? getInitials(profile.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {profile?.name || "Usuário"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

