import { useState, useEffect, memo, useCallback } from "react";
import { Heart, MessageCircle, Eye, Sparkles, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/lib/mockData";
import { isDocumentNew } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleDocumentLike } from "@/hooks/useDocumentsQuery";
import { toast } from "sonner";

interface DocumentCardProps {
  document: Document & {
    is_premium?: boolean;
    is_unlocked?: boolean;
  };
  onOpen: (document: Document) => void;
  // Stats passed from parent to avoid N+1 queries
  isLiked?: boolean;
  likesCount?: number;
}

export const DocumentCard = memo(function DocumentCard({ 
  document, 
  onOpen, 
  isLiked: initialIsLiked = false,
  likesCount: initialLikesCount 
}: DocumentCardProps) {
  const { user } = useAuth();
  const isNew = isDocumentNew(document.publishedAt);
  const isPremium = document.is_premium ?? false;
  const isLocked = isPremium && !document.is_unlocked;

  // Mutation para dar/remover like
  const toggleLikeMutation = useToggleDocumentLike();

  // Estado local sincronizado com props
  const [liked, setLiked] = useState(initialIsLiked);
  const [likes, setLikes] = useState(initialLikesCount ?? document.likes);

  // Sincronizar estado com props quando mudarem
  useEffect(() => {
    setLiked(initialIsLiked);
  }, [initialIsLiked]);

  useEffect(() => {
    if (initialLikesCount !== undefined) {
      setLikes(initialLikesCount);
    } else {
      setLikes(document.likes);
    }
  }, [initialLikesCount, document.likes]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error("Você precisa estar logado para curtir relatórios");
      return;
    }

    // Otimistic update
    const wasLiked = liked;
    const previousLikes = likes;
    setLiked(!wasLiked);
    setLikes(wasLiked ? likes - 1 : likes + 1);

    try {
      const newLikedState = await toggleLikeMutation.mutateAsync({
        documentId: document.id,
        userId: user.id,
      });

      // Atualizar estado com resultado real
      setLiked(newLikedState);
    } catch (error: any) {
      // Reverter em caso de erro
      setLiked(wasLiked);
      setLikes(previousLikes);
      toast.error("Erro ao curtir relatório. Tente novamente.");
      console.error("Erro ao dar like:", error);
    }
  }, [user, liked, likes, document.id, toggleLikeMutation]);

  const handleOpen = useCallback(() => {
    onOpen(document);
  }, [onOpen, document]);

  return (
    <Card
        className={`group cursor-pointer border shadow-elegant hover:shadow-cyan hover:border-cyan/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-card relative select-none shimmer-effect ${
          isNew ? "border-cyan/30 ring-1 ring-cyan/20" : isPremium ? "border-yellow-500/30 ring-1 ring-yellow-500/20" : "border-navy/8"
        } ${isLocked ? "opacity-75" : ""}`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTouchCallout: 'none',
          willChange: 'transform',
        }}
        onClick={handleOpen}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {isNew && (
            <Badge className="bg-accent text-accent-foreground border-0 shadow-md shadow-cyan/30 text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5">
              <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1" />
              NOVO
            </Badge>
          )}
          {isPremium && (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-md text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5">
              <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:w-3 mr-0.5 sm:mr-1" />
              PREMIUM
            </Badge>
          )}
        </div>
        {isLocked && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
        <CardHeader className={`pb-2 sm:pb-3 px-4 sm:px-6 select-none pointer-events-none ${isNew ? 'pt-12 sm:pt-12' : 'pt-4 sm:pt-6'}`}>
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
          <CardTitle className="text-[15px] sm:text-[17px] font-medium leading-tight tracking-tight text-foreground group-hover:text-cyan transition-all duration-300">
            {document.title}
          </CardTitle>
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 border-navy/15 text-navy/70 bg-navy/5 transition-all duration-300 group-hover:border-cyan/30 group-hover:bg-cyan/10 group-hover:text-cyan"
          >
            {document.category}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 sm:line-clamp-3 text-[13px] sm:text-[14px] font-light leading-relaxed text-muted-foreground transition-all duration-300 group-hover:text-foreground">
          {document.description}
        </CardDescription>
      </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-3 sm:pb-4 select-none pointer-events-none">
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {document.keywords.slice(0, 4).map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="text-[9px] sm:text-[10px] font-normal px-1.5 sm:px-2 py-0.5 bg-gradient-brand/10 border-0 text-cyan transition-all duration-300 group-hover:bg-gradient-brand/20 rounded-md"
            >
              {keyword}
            </Badge>
          ))}
        </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between px-4 sm:px-6 pb-4 sm:pb-5 pt-1.5 sm:pt-2 text-[12px] sm:text-[13px] text-cyan/70 border-t border-cyan/10 select-none">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Ícones menores em mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-none">
            <Eye className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-[1.5]" />
            <span className="font-light text-[11px] sm:text-[13px]">{document.views}</span>
          </div>
          <button
            onClick={handleLike}
            disabled={toggleLikeMutation.isPending || !user}
            className="group/like flex items-center gap-1 sm:gap-1.5 hover:text-aqua transition-all duration-300 active:scale-90 pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart className={`h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-[1.5] transition-all duration-300 ${
              liked 
                ? "fill-aqua text-aqua scale-110 animate-bounce-in" 
                : "group-hover/like:scale-110 group-hover/like:rotate-12"
            }`} />
            <span className="font-light text-[11px] sm:text-[13px] transition-all duration-300">{likes}</span>
          </button>
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-none">
            <MessageCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-[1.5]" />
            <span className="font-light text-[11px] sm:text-[13px]">{document.comments}</span>
          </div>
        </div>
          <span className="text-[10px] sm:text-[12px] font-light text-muted-foreground pointer-events-none">
            {new Date(document.publishedAt).toLocaleDateString("pt-BR")}
          </span>
        </CardFooter>
      </Card>
  );
});
