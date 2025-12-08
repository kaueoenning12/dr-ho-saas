import { useEffect, useState, useRef } from "react";
import { Shield, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ImageViewerProps {
  document: {
    id: string;
    title: string;
    pdfUrl: string;
    category?: string;
  } | null;
}

export function ImageViewer({ document }: ImageViewerProps) {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { user } = useAuth();

  // Calculate optimal scale with fixed padding (margem superior fixa)
  const calculateOptimalScale = (): number | null => {
    if (!containerRef.current || !imageRef.current || !imageRef.current.complete) {
      return null;
    }

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const imageWidth = imageRef.current.naturalWidth;
    const imageHeight = imageRef.current.naturalHeight;

    if (imageWidth <= 0 || imageHeight <= 0) {
      return null;
    }

    // Padding fixo: margem superior e laterais constantes
    const isMobile = containerWidth < 768;
    const horizontalPadding = isMobile ? 16 : 32;
    const topPadding = isMobile ? 24 : 48; // Margem superior fixa
    const bottomPadding = isMobile ? 24 : 48; // Margem inferior para scroll

    // Calcular scale considerando padding fixo
    // Largura disponível = containerWidth - 2 * horizontalPadding
    // Altura disponível = containerHeight - topPadding - bottomPadding
    const availableWidth = containerWidth - (2 * horizontalPadding);
    const availableHeight = containerHeight - topPadding - bottomPadding;

    const scaleX = availableWidth / imageWidth;
    const scaleY = availableHeight / imageHeight;
    const calculatedScale = Math.min(scaleX, scaleY);

    // Limitar scale entre 0.3 e 1.0 para fit inicial
    // Usuário pode fazer zoom manual depois
    const finalScale = Math.max(0.3, Math.min(1.0, calculatedScale));

    return finalScale;
  };

  // Obter padding fixo baseado no tamanho da tela
  const getFixedPadding = () => {
    if (!containerRef.current) {
      return { top: 48, horizontal: 32 };
    }
    const isMobile = containerRef.current.clientWidth < 768;
    return {
      top: isMobile ? 24 : 48,
      horizontal: isMobile ? 16 : 32,
    };
  };

  useEffect(() => {
    if (!document) return;

    setIsLoading(true);
    setImageError(false);

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setShowProtectionWarning(true);
      toast.error("Este conteúdo está protegido e não pode ser copiado.", {
        duration: 3000,
      });
      setTimeout(() => setShowProtectionWarning(false), 2000);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setShowProtectionWarning(true);
      toast.info("Botão direito desabilitado para proteção de conteúdo.", {
        duration: 2000,
      });
      setTimeout(() => setShowProtectionWarning(false), 2000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const forbiddenCtrlKeys = ["c", "a", "p", "s", "u", "d", "j"];

      if (isCtrlOrMeta && forbiddenCtrlKeys.includes(key)) {
        e.preventDefault();
        toast.error("Esta ação está desabilitada para proteção de conteúdo.");
        return;
      }

      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "p" || key === "s")) {
        e.preventDefault();
        toast.error("Esta ação está desabilitada para proteção de conteúdo.");
        return;
      }

      if (e.key === "F12" || e.key === "F11") {
        e.preventDefault();
      }
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const handleDragStart = (e: Event) => {
      e.preventDefault();
    };

    const handleBeforePrint = (e: Event) => {
      e.preventDefault?.();
      toast.error("Impressão desabilitada para este relatório protegido.");
      window.setTimeout(() => window.focus(), 0);
    };

    const doc = window.document;
    const winRef = window;
    const docBody = doc.body;
    const docElement = doc.documentElement;

    const previousBodyUserSelect = docBody.style.userSelect;
    const previousBodyWebkitUserSelect = (docBody.style as any).WebkitUserSelect;
    const previousBodyMozUserSelect = (docBody.style as any).MozUserSelect;
    const previousBodyMsUserSelect = (docBody.style as any).msUserSelect;
    const previousBodyTouchCallout = (docBody.style as any).WebkitTouchCallout;
    const previousHtmlUserSelect = docElement.style.userSelect;

    docBody.style.userSelect = "none";
    (docBody.style as any).WebkitUserSelect = "none";
    (docBody.style as any).MozUserSelect = "none";
    (docBody.style as any).msUserSelect = "none";
    (docBody.style as any).WebkitTouchCallout = "none";
    docElement.style.userSelect = "none";

    doc.addEventListener("copy", handleCopy);
    doc.addEventListener("contextmenu", handleContextMenu);
    doc.addEventListener("keydown", handleKeyDown);
    doc.addEventListener("selectstart", handleSelectStart);
    doc.addEventListener("dragstart", handleDragStart);
    winRef.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      doc.removeEventListener("copy", handleCopy);
      doc.removeEventListener("contextmenu", handleContextMenu);
      doc.removeEventListener("keydown", handleKeyDown);
      doc.removeEventListener("selectstart", handleSelectStart);
      doc.removeEventListener("dragstart", handleDragStart);
      winRef.removeEventListener("beforeprint", handleBeforePrint);

      docBody.style.userSelect = previousBodyUserSelect;
      (docBody.style as any).WebkitUserSelect = previousBodyWebkitUserSelect;
      (docBody.style as any).MozUserSelect = previousBodyMozUserSelect;
      (docBody.style as any).msUserSelect = previousBodyMsUserSelect;
      (docBody.style as any).WebkitTouchCallout = previousBodyTouchCallout;
      docElement.style.userSelect = previousHtmlUserSelect;
    };
  }, [document]);

  // Calculate auto scale on window resize (only if image is loaded)
  // E ajustar scroll para manter topo visível
  useEffect(() => {
    const calculateAutoScale = () => {
      // Verificar se container tem dimensões válidas antes de calcular
      if (containerRef.current && 
          containerRef.current.clientWidth > 0 && 
          containerRef.current.clientHeight > 0) {
        const optimalScale = calculateOptimalScale();
        if (optimalScale !== null) {
          setScale(optimalScale);
          // Resetar scroll para o topo ao redimensionar
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        }
      }
    };

    window.addEventListener('resize', calculateAutoScale);
    return () => {
      window.removeEventListener('resize', calculateAutoScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.pdfUrl]);

  // Ajustar scroll ao mudar zoom para manter margem superior visível
  useEffect(() => {
    if (containerRef.current) {
      // Manter scroll no topo quando zoom muda
      // Isso garante que a margem superior sempre fique visível
      containerRef.current.scrollTop = 0;
    }
  }, [scale]);

  const handleZoomIn = () => {
    setScale((prev) => {
      const newScale = Math.min(prev + 0.2, 3);
      // Ajustar scroll para manter topo visível após zoom
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 0);
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.2, 0.3);
      // Ajustar scroll para manter topo visível após zoom
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 0);
      return newScale;
    });
  };

  const handleZoomReset = () => {
    const optimalScale = calculateOptimalScale();
    if (optimalScale !== null) {
      setScale(optimalScale);
      // Resetar scroll ao resetar zoom
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 0);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    // Aumentar delay e adicionar verificação de dimensões
    setTimeout(() => {
      // Verificar se container tem dimensões válidas
      if (containerRef.current && 
          containerRef.current.clientWidth > 0 && 
          containerRef.current.clientHeight > 0) {
        const optimalScale = calculateOptimalScale();
        if (optimalScale !== null) {
          setScale(optimalScale);
          // Resetar scroll para o topo ao carregar imagem
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        }
      } else {
        // Retry após mais tempo se dimensões ainda não estão disponíveis
        setTimeout(() => {
          const optimalScale = calculateOptimalScale();
          if (optimalScale !== null) {
            setScale(optimalScale);
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
          }
        }, 100);
      }
    }, 100);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
    toast.error("Erro ao carregar a imagem.");
  };

  if (!document) return null;

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {document.title}
            </h2>
            {document.category && (
              <Badge variant="secondary" className="text-xs">
                {document.category}
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan/10 border-cyan/20 text-cyan">
              <Shield className="h-3 w-3" />
              <span className="text-xs font-medium">Protegido</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="border-b border-cyan/10 px-4 py-2 flex items-center gap-2 bg-background/70">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={scale <= 0.3}
          className="h-8 px-2"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomReset}
          className="h-8 px-2"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="h-8 px-2"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          Zoom: {(scale * 100).toFixed(0)}%
        </span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-50 relative">
        {showProtectionWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Conteúdo Protegido</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-cyan mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">
                Carregando imagem...
              </p>
            </div>
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Erro ao carregar imagem
                </h3>
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar a imagem. Verifique se o arquivo existe e está acessível.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="relative w-full"
            style={{
              paddingTop: getFixedPadding().top,
              paddingLeft: getFixedPadding().horizontal,
              paddingRight: getFixedPadding().horizontal,
              paddingBottom: getFixedPadding().horizontal,
            }}
          >
            {/* Watermark de proteção */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20">
              <div
                className="absolute w-full h-full flex flex-wrap items-center justify-center gap-32 opacity-[0.02] text-5xl font-bold text-gray-900 select-none"
                style={{
                  transform: "rotate(-45deg)",
                  transformOrigin: "center",
                }}
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap select-none">
                    {user?.name || "Doutor HO"} - Protegido
                  </span>
                ))}
              </div>
            </div>

            {/* Imagem com padding fixo e transform-origin no topo */}
            <img
              ref={imageRef}
              src={document.pdfUrl}
              alt={document.title}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="shadow-2xl rounded-lg"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                display: 'block',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTouchCallout: 'none',
                pointerEvents: 'auto',
                transition: 'transform 0.2s ease-in-out',
              }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

