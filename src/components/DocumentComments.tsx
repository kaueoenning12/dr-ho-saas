import { useState } from "react";
import { MessageCircle, Send, Loader2, Edit2, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentComments, useCreateComment, useUpdateComment, useDeleteComment } from "@/hooks/useDocumentsQuery";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentCommentsProps {
  documentId: string;
}

export function DocumentComments({ documentId }: DocumentCommentsProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const { data: comments = [], isLoading } = useDocumentComments(documentId);
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

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

  const handleEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim()) {
      toast.error("O comentário não pode estar vazio");
      return;
    }

    try {
      await updateCommentMutation.mutateAsync({
        commentId,
        content: editingText.trim(),
        documentId,
      });
      setEditingCommentId(null);
      setEditingText("");
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteCommentId) return;

    try {
      await deleteCommentMutation.mutateAsync({
        commentId: deleteCommentId,
        documentId,
      });
      setDeleteCommentId(null);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  return (
    <div className="bg-background">
      <div className="space-y-6">

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
              const isEditing = editingCommentId === comment.id;
              
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
                          {comment.updated_at && comment.updated_at !== comment.created_at && (
                            <span className="ml-1">(editado)</span>
                          )}
                        </p>
                      </div>
                      {isOwnComment && !isEditing && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(comment)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] resize-none border-cyan/20 focus:border-cyan"
                          disabled={updateCommentMutation.isPending}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updateCommentMutation.isPending}
                            className="h-8"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={updateCommentMutation.isPending || !editingText.trim()}
                            className="h-8 bg-cyan hover:bg-cyan/90 text-white"
                          >
                            {updateCommentMutation.isPending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Salvar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comentário será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCommentMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCommentMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteCommentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

