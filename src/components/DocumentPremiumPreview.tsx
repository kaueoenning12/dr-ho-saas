import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentPremiumPreviewProps {
  title: string;
  previewImageUrl?: string;
  isEligible: boolean;
  onUnlockClick: () => void;
  className?: string;
}

export function DocumentPremiumPreview({
  title,
  previewImageUrl,
  isEligible,
  onUnlockClick,
  className,
}: DocumentPremiumPreviewProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header with Premium Badge */}
      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-b">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold truncate">{title}</h2>
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shrink-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        </div>
      </div>

      {/* Blurred Preview */}
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt="Preview"
            className="w-full h-full object-cover blur-xl scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2 blur-sm">
              <div className="w-full h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
              <div className="w-3/4 h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
              <div className="w-5/6 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        )}

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <Lock className="w-16 h-16 text-white mb-4" />
          <p className="text-white text-lg font-semibold mb-2">
            Conteúdo Premium Bloqueado
          </p>
          <p className="text-white/80 text-sm mb-6">
            {isEligible
              ? "Avalie para desbloquear este conteúdo"
              : "Requer plano Premium ou Avançado"}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-6 text-center">
        {isEligible ? (
          <Button
            onClick={onUnlockClick}
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Desbloquear Agora
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upgrade seu plano para acessar conteúdos premium
            </p>
            <Button
              onClick={() => (window.location.href = "/plans")}
              size="lg"
              variant="outline"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            >
              Ver Planos Premium
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

