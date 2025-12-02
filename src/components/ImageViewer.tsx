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

  // Calculate optimal scale with responsive margins
  // Allows up to 96% zoom for small images on mobile, better space utilization
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

    // Responsive margins: smaller on mobile for better space utilization
    const isMobile = containerWidth < 768;
    const horizontalMargin = isMobile ? 16 : 32;
    const verticalMargin = isMobile ? 24 : 48;

    // 1. Calcular scale normal primeiro para entender o tamanho relativo da imagem
    const scaleX = (containerWidth - horizontalMargin) / imageWidth;
    const scaleY = (containerHeight - verticalMargin) / imageHeight;
    const calculatedScale = Math.min(scaleX, scaleY);

    // 2. Verificar se largura permite 96%
    const imageWidthAt96 = imageWidth * 0.96;
    const fitsAt96Width = imageWidthAt96 + horizontalMargin <= containerWidth;

    // 3. Heurística: verificar se imagem é relativamente pequena
    // Se imageWidth < containerWidth * 3, considerar relativamente pequena
    const isRelativelySmall = imageWidth < containerWidth * 3;

    // Logs de debug
    console.log('[ImageViewer] Debug:', {
      containerWidth,
      containerHeight,
      imageWidth,
      imageHeight,
      imageWidthAt96,
      fitsAt96Width,
      horizontalMargin,
      verticalMargin,
      isMobile,
      scaleX,
      scaleY,
      calculatedScale,
      isRelativelySmall
    });

    // 4. Se calculatedScale >= 0.3 (imagem não é extremamente grande) E
    //    (largura permite 96% OU imagem é relativamente pequena), usar 96%
    if (calculatedScale >= 0.3 && (fitsAt96Width || isRelativelySmall)) {
      console.log('[ImageViewer] Using 96% - calculatedScale >= 0.3 and (width fits or relatively small)');
      return 0.96;
    }

    // 5. Caso contrário, usar calculatedScale com limites apropriados
    let finalScale: number;
    if (calculatedScale > 1.0) {
      // Image is smaller than container - cap at 0.96 to avoid pixelation
      finalScale = 0.96;
    } else {
      // Use calculated scale (may be less than 0.96 for very large images)
      finalScale = calculatedScale;
    }

    // 6. Garantir mínimo de 0.3
    finalScale = Math.max(0.3, finalScale);

    console.log('[ImageViewer] Final scale:', finalScale);
    return finalScale;
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
      toast.error("Impressão desabilitada para este documento protegido.");
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
  useEffect(() => {
    const calculateAutoScale = () => {
      // Verificar se container tem dimensões válidas antes de calcular
      if (containerRef.current && 
          containerRef.current.clientWidth > 0 && 
          containerRef.current.clientHeight > 0) {
        const optimalScale = calculateOptimalScale();
        if (optimalScale !== null) {
          console.log('[ImageViewer] Setting scale on resize:', optimalScale);
          setScale(optimalScale);
        }
      }
    };

    window.addEventListener('resize', calculateAutoScale);
    return () => {
      window.removeEventListener('resize', calculateAutoScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.pdfUrl]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.3));
  };

  const handleZoomReset = () => {
    const optimalScale = calculateOptimalScale();
    if (optimalScale !== null) {
      setScale(optimalScale);
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
          console.log('[ImageViewer] Setting scale on image load:', optimalScale);
          setScale(optimalScale);
        }
      } else {
        // Retry após mais tempo se dimensões ainda não estão disponíveis
        console.log('[ImageViewer] Container dimensions not ready, retrying...');
        setTimeout(() => {
          const optimalScale = calculateOptimalScale();
          if (optimalScale !== null) {
            console.log('[ImageViewer] Setting scale on retry:', optimalScale);
            setScale(optimalScale);
          }
        }, 100);
      }
    }, 100); // Aumentar de 50ms para 100ms
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
          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
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

            {/* Imagem */}
            <img
              ref={imageRef}
              src={document.pdfUrl}
              alt={document.title}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              style={{
                transform: `scale(${scale})`,
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

