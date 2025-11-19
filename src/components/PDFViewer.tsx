import { useEffect, useState, useRef, useMemo } from "react";
import {
  Shield,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Document as ViewerDocument, mockDocumentContents } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Document as PDFDocument,
  Page,
  pdfjs,
} from "react-pdf";

// Configurar o worker do PDF.js via CDN (garante compatibilidade de versões)
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  console.log("[PDFViewer] Worker configurado:", pdfjs.GlobalWorkerOptions.workerSrc);
  console.log("[PDFViewer] PDF.js version:", pdfjs.version);
} catch (error) {
  console.error("[PDFViewer] Erro ao configurar worker:", error);
  // Fallback para unpkg se jsDelivr falhar
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  document: ViewerDocument | null;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [autoScale, setAutoScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedPdfUrlRef = useRef<string | null>(null);
  const pdfSourceRef = useRef<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!document) return;

    setIsLoading(true);
    setIsFetchingPdf(false);
    setPdfSource(null);
    setScale(1);
    setNumPages(0);

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

  // Memoize the PDF URL to prevent unnecessary re-renders
  const pdfUrl = useMemo(() => document?.pdfUrl, [document?.pdfUrl]);
  const documentId = useMemo(() => document?.id, [document?.id]);

  useEffect(() => {
    if (!document || !pdfUrl) return;

    const hasSimulatedContent = mockDocumentContents[document.id];
    if (hasSimulatedContent) {
      setIsLoading(false);
      setIsFetchingPdf(false);
      loadedPdfUrlRef.current = pdfUrl;
      return;
    }

    // Skip if we already have this PDF loaded
    if (loadedPdfUrlRef.current === pdfUrl) {
      return;
    }

    const fetchPdfAsBlob = async () => {
      try {
        setIsFetchingPdf(true);
        console.log("[PDFViewer] Iniciando fetch do PDF:", pdfUrl);

        // Revoke previous blob URL if exists and URL changed
        if (pdfSourceRef.current?.startsWith("blob:") && loadedPdfUrlRef.current !== pdfUrl) {
          URL.revokeObjectURL(pdfSourceRef.current);
          pdfSourceRef.current = null;
        }

        // Fetch simples - a URL assinada já tem o token, não precisa de credentials
        const response = await fetch(pdfUrl);
        
        console.log("[PDFViewer] Response status:", response.status);
        console.log("[PDFViewer] Response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`Erro ao buscar PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log("[PDFViewer] PDF blob criado, tamanho:", blob.size, "bytes");
        
        const objectUrl = URL.createObjectURL(blob);
        console.log("[PDFViewer] Object URL criada:", objectUrl);

        loadedPdfUrlRef.current = pdfUrl;
        pdfSourceRef.current = objectUrl;
        setPdfSource(objectUrl);
        setIsLoading(false);
      } catch (error: any) {
        console.error("[PDFViewer] Erro completo:", {
          message: error.message,
          stack: error.stack,
          url: pdfUrl
        });
        
        // Mensagem de erro mais específica
        let errorMessage = "Erro ao carregar o PDF. Tente novamente.";
        if (error.message.includes('400')) {
          errorMessage = "Arquivo não encontrado ou URL inválida. Verifique se o documento existe.";
        } else if (error.message.includes('403')) {
          errorMessage = "Acesso negado ao arquivo. Verifique suas permissões.";
        } else if (error.message.includes('404')) {
          errorMessage = "Arquivo não encontrado no servidor.";
        }
        
        toast.error(errorMessage);
        setIsLoading(false);
      } finally {
        setIsFetchingPdf(false);
      }
    };

    fetchPdfAsBlob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, documentId]);

  // Cleanup blob URL on unmount or when URL changes
  useEffect(() => {
    return () => {
      if (pdfSourceRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfSourceRef.current);
        pdfSourceRef.current = null;
      }
    };
  }, [pdfUrl]);

  // Calcular escala automática baseado na largura do container
  useEffect(() => {
    const calculateAutoScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // 595 é a largura padrão de uma página A4 em pontos
        // Usar margens menores (32px no mobile, 48px no desktop) para melhor aproveitamento do espaço
        const isMobile = containerWidth < 768;
        const horizontalMargin = isMobile ? 32 : 48;
        const calculatedScale = (containerWidth - horizontalMargin) / 595;
        // Limitar entre 0.7 e 2.0 para permitir melhor adaptação
        const boundedScale = Math.max(0.7, Math.min(2.0, calculatedScale));
        setAutoScale(boundedScale);
        setScale(boundedScale);
      }
    };

    calculateAutoScale();
    window.addEventListener('resize', calculateAutoScale);

    return () => {
      window.removeEventListener('resize', calculateAutoScale);
    };
  }, [pdfSource]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleZoomReset = () => {
    setScale(autoScale);
  };

  const getPageWidth = () => {
    if (!containerRef.current) return undefined;
    const containerWidth = containerRef.current.clientWidth;
    // Usar margens menores (32px no mobile, 48px no desktop)
    const isMobile = containerWidth < 768;
    const horizontalMargin = isMobile ? 32 : 48;
    const baseWidth = containerWidth - horizontalMargin;
    
    // Se scale está no auto (fit-to-page), usar largura base
    if (Math.abs(scale - autoScale) < 0.01) {
      return baseWidth;
    }
    
    // Se usuário deu zoom manual, calcular proporcionalmente
    const zoomFactor = scale / autoScale;
    return baseWidth * zoomFactor;
  };

  const handlePdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handlePdfLoadError = (error: Error) => {
    console.error("[PDFViewer] Erro ao renderizar PDF:", error);
    toast.error("Erro ao renderizar o PDF.");
    setIsLoading(false);
  };

  if (!document) return null;

  const hasSimulatedContent = mockDocumentContents[document.id];

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
          disabled={scale <= 0.6}
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
          disabled={scale >= 2}
          className="h-8 px-2"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          Zoom: {(scale * 100).toFixed(0)}% {Math.abs(scale - autoScale) < 0.01 && "(Auto)"}
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

        {hasSimulatedContent ? (
          <div 
            className="relative w-full h-full"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            onDragStart={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
              <div className="max-w-4xl w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 sm:p-12 space-y-6">
                <div className="flex items-center justify-center gap-2 text-cyan mb-6">
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Modo de Visualização Protegida
                  </span>
                </div>

                <div 
                  className="prose dark:prose-invert max-w-none space-y-6"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                  }}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                >
                  <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                    {mockDocumentContents[document.id]}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-cyan/20 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 text-cyan" />
                  <span>
                    Este documento está protegido. Cópia, impressão e downloads estão desabilitados.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {(isLoading || isFetchingPdf) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan mx-auto" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {isFetchingPdf ? "Carregando PDF..." : "Renderizando documento..."}
                  </p>
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 w-full text-center py-2 text-xs font-medium text-muted-foreground pointer-events-none z-10 opacity-30">
              {document.title}
            </div>

            {pdfSource && (
              <div 
                className="flex flex-col items-center py-4 sm:py-6 space-y-4 bg-gray-50 min-h-full px-2 sm:px-4"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
              >
                <PDFDocument
                  file={pdfSource}
                  onLoadSuccess={handlePdfLoadSuccess}
                  onLoadError={handlePdfLoadError}
                  loading={
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan" />
                    </div>
                  }
                >
                  {Array.from(new Array(numPages), (_, index) => (
                    <div
                      key={`page_${index + 1}`}
                      className="mb-4 shadow-lg bg-white"
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                      }}
                    >
                      <Page
                        pageNumber={index + 1}
                        width={getPageWidth()}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={
                          <div className="flex items-center justify-center p-12 bg-muted/20">
                            <Loader2 className="h-6 w-6 animate-spin text-cyan" />
                          </div>
                        }
                      />
                    </div>
                  ))}
                </PDFDocument>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
