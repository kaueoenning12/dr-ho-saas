import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { useUnlockDocument } from "@/hooks/useDocumentUnlocks";
import { StarRating as StarRatingType } from "@/types/premium";
import { Sparkles } from "lucide-react";

interface DocumentUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  onUnlockSuccess: () => void;
}

export function DocumentUnlockModal({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  onUnlockSuccess,
}: DocumentUnlockModalProps) {
  const [rating, setRating] = useState<StarRatingType | null>(null);
  const unlockMutation = useUnlockDocument();

  const handleUnlock = async () => {
    if (!rating) return;

    try {
      await unlockMutation.mutateAsync({
        documentId,
        rating,
      });
      onUnlockSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Unlock error:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!unlockMutation.isPending) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setRating(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <DialogTitle>Desbloquear Conteúdo Premium</DialogTitle>
          </div>
          <DialogDescription>
            Avalie este conteúdo para desbloqueá-lo permanentemente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm font-medium text-center">
            {documentTitle}
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Como você avalia este conteúdo?
            </p>
            <StarRating
              rating={rating || 0}
              onRatingChange={setRating}
              size="lg"
            />
            {rating && (
              <p className="text-xs text-muted-foreground">
                {rating} estrela{rating > 1 ? "s" : ""} selecionada{rating > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={unlockMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleUnlock}
            disabled={!rating || unlockMutation.isPending}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            {unlockMutation.isPending ? "Desbloqueando..." : "Desbloquear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

