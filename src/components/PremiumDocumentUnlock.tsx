import { useState } from "react";
import { Lock, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { useUnlockDocument, useCanAccessPremium } from "@/hooks/usePremiumDocuments";
import { useNavigate } from "react-router-dom";
import type { StarRating as StarRatingType } from "@/types/premium";

interface PremiumDocumentUnlockProps {
  documentId: string;
  documentTitle: string;
  previewImageUrl?: string;
}

export function PremiumDocumentUnlock({
  documentId,
  documentTitle,
  previewImageUrl,
}: PremiumDocumentUnlockProps) {
  const [rating, setRating] = useState<StarRatingType | null>(null);
  const unlockMutation = useUnlockDocument();
  const { data: canAccess, isLoading: isCheckingAccess } = useCanAccessPremium();
  const navigate = useNavigate();

  const handleUnlock = async () => {
    if (!rating) {
      return;
    }

    await unlockMutation.mutateAsync({
      documentId,
      rating,
    });
  };

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Conteúdo Premium</CardTitle>
          <CardDescription>
            Este é um documento premium exclusivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {previewImageUrl && (
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={previewImageUrl}
                alt="Prévia do documento"
                className="w-full h-64 object-cover blur-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/20" />
            </div>
          )}
          
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Para acessar este conteúdo exclusivo, você precisa de um plano Premium ou Avançado.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>Faça upgrade e tenha acesso a todo conteúdo premium</span>
            </div>

            <Button
              size="lg"
              onClick={() => navigate("/plans")}
              className="w-full sm:w-auto"
            >
              Ver Planos Disponíveis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Avaliar para Desbloquear</CardTitle>
        <CardDescription>
          Avalie este documento para ter acesso completo ao conteúdo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {previewImageUrl && (
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={previewImageUrl}
              alt="Prévia do documento"
              className="w-full h-64 object-cover blur-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/20 flex items-center justify-center">
              <div className="text-center text-white space-y-2">
                <Lock className="w-12 h-12 mx-auto" />
                <p className="font-semibold">Conteúdo Bloqueado</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Como você avalia este documento?</h3>
            <p className="text-sm text-muted-foreground">
              Sua avaliação nos ajuda a melhorar nosso conteúdo
            </p>
          </div>

          <div className="flex justify-center py-4">
            <StarRating
              rating={rating || 0}
              onRatingChange={setRating}
              size="lg"
            />
          </div>

          {rating && (
            <div className="text-center text-sm text-muted-foreground">
              Você selecionou: {rating} estrela{rating > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <Button
          size="lg"
          onClick={handleUnlock}
          disabled={!rating || unlockMutation.isPending}
          className="w-full"
        >
          {unlockMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Desbloqueando...
            </>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              Desbloquear Agora
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Após avaliar, você terá acesso permanente a este documento
        </p>
      </CardContent>
    </Card>
  );
}
