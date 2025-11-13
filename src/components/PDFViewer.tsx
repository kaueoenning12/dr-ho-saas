import { useEffect, useState } from "react";
import {
  X,
  Shield,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Document as ViewerDocument, mockDocumentContents } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Document as PDFDocument,
  Page,
  pdfjs,
  type PDFDocumentProxy,
} from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url,
).toString();

interface PDFViewerProps {
  document: ViewerDocument | null;
  open: boolean;
  onClose: () => void;
}

export function PDFViewer({ document, open, onClose }: PDFViewerProps) {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;

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
      const forbiddenCtrlKeys = ["c", "a", "p", "s", "u"];

      if (isCtrlOrMeta && forbiddenCtrlKeys.includes(key)) {
        e.preventDefault();
        toast.error("Esta ação está desabilitada para proteção de conteúdo.");
        return;
      }

      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "p" || key === "s")) {
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

    doc.addEventListener("copy", handleCopy, true);
    doc.addEventListener("contextmenu", handleContextMenu, true);
    doc.addEventListener("keydown", handleKeyDown, true);
    doc.addEventListener("selectstart", handleSelectStart, true);
    doc.addEventListener("dragstart", handleDragStart, true);
    winRef.addEventListener("keydown", handleKeyDown, true);
    winRef.addEventListener("beforeprint", handleBeforePrint, true);

    return () => {
      doc.removeEventListener("copy", handleCopy, true);
      doc.removeEventListener("contextmenu", handleContextMenu, true);
      doc.removeEventListener("keydown", handleKeyDown, true);
      doc.removeEventListener("selectstart", handleSelectStart, true);
      doc.removeEventListener("dragstart", handleDragStart, true);
      winRef.removeEventListener("keydown", handleKeyDown, true);
      winRef.removeEventListener("beforeprint", handleBeforePrint, true);
      docBody.style.userSelect = previousBodyUserSelect;
      (docBody.style as any).WebkitUserSelect = previousBodyWebkitUserSelect;
      (docBody.style as any).MozUserSelect = previousBodyMozUserSelect;
      (docBody.style as any).msUserSelect = previousBodyMsUserSelect;
      (docBody.style as any).WebkitTouchCallout = previousBodyTouchCallout;
      docElement.style.userSelect = previousHtmlUserSelect;
    };
  }, [open]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleZoomReset = () => {
    setScale(1);
  };

  const handlePdfLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    setIsLoading(false);
  };

  const handlePdfLoadError = () => {
    setIsLoading(false);
    toast.error("Não foi possível carregar o documento protegido.");
  };

  useEffect(() => {
    if (!open) return;
    const currentPdfUrl = document?.pdfUrl;
    if (!document || !currentPdfUrl) return;

    const hasSimulatedContent = Boolean(mockDocumentContents[document.id]);
    if (hasSimulatedContent) return;

    const abortController = new AbortController();
    let objectUrl: string | null = null;

    const fetchPdf = async () => {
      try {
        setIsFetchingPdf(true);
        const response = await fetch(currentPdfUrl, {
          credentials: "include",
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Falha ao obter PDF protegido.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setPdfSource(objectUrl);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error(error);
          setPdfSource(currentPdfUrl);
          toast.error("Não foi possível aplicar proteção extra ao PDF. Carregando fallback.");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsFetchingPdf(false);
        }
      }
    };

    fetchPdf();

    return () => {
      abortController.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, document?.id, document?.pdfUrl]);

  useEffect(() => {
    if (!open) {
      if (pdfSource?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfSource);
      }
      setPdfSource(null);
    }
  }, [open, pdfSource]);

  if (!document) return null;

  const hasSimulatedContent = mockDocumentContents[document.id];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[90vw] sm:max-w-6xl h-[80vh] sm:h-[85vh] flex flex-col p-0 border-cyan/20 shadow-2xl [&>button]:hidden"
        aria-describedby="pdf-viewer-protection-description"
      >
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-cyan/20 bg-gradient-to-r from-cyan/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-lg font-semibold text-foreground truncate">
                {document.title}
              </DialogTitle>
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-cyan/10 border-cyan/20 text-cyan">
                <Shield className="h-3 w-3" />
                <span className="text-xs font-medium">Protegido</span>
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <DialogDescription className="sr-only" id="pdf-viewer-protection-description">
          Visualizador protegido. A cópia, impressão e download deste PDF estão desabilitados.
        </DialogDescription>
        
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
            Zoom: {(scale * 100).toFixed(0)}%
          </span>
        </div>

        <div
          className="flex-1 overflow-auto bg-gradient-to-br from-muted/30 to-muted/10 relative"
        >
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
              {/* Watermark de proteção - repetido para cobrir toda área */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30">
                <div 
                  className="absolute w-full h-full flex flex-wrap items-center justify-center gap-32 opacity-[0.02] text-5xl font-bold text-gray-900 select-none"
                  style={{ 
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center',
                  }}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="whitespace-nowrap select-none">
                      {user?.name || 'Doutor HO'} - Protegido
                    </span>
                  ))}
                </div>
              </div>
              
              <div
                className="relative px-6 py-6 sm:px-10 select-none"
                style={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
              >
                <div
                  className="origin-top mx-auto max-w-4xl"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                  }}
                >
                  <pre
                  className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-card/40 rounded-lg p-6 shadow-lg border border-border/40"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                    }}
                  >
                    {mockDocumentContents[document.id]}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative w-full min-h-full"
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              {/* Estado de loading */}
          {(isLoading || isFetchingPdf) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
                  <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-cyan mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  {isFetchingPdf ? "Aplicando proteção ao documento..." : "Carregando documento..."}
                </p>
                  </div>
                </div>
              )}

              {/* Watermark sobre PDF */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30">
                <div 
                  className="absolute w-full h-full flex flex-wrap items-center justify-center gap-32 opacity-[0.02] text-5xl font-bold text-gray-900 select-none"
                  style={{ 
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center',
                  }}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="whitespace-nowrap select-none">
                      {user?.name || 'Doutor HO'} - Protegido
                    </span>
                  ))}
                </div>
              </div>
              
              <div
                className="relative px-4 sm:px-8 py-6 select-none"
                style={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                <PDFDocument
                  file={pdfSource ?? document.pdfUrl}
                  onLoadSuccess={handlePdfLoadSuccess}
                  onLoadError={handlePdfLoadError}
                  loading={
                    <div className="flex justify-center py-10 text-sm text-muted-foreground">
                      Processando documento...
                    </div>
                  }
                  error={
                    <div className="flex justify-center py-10 text-sm text-destructive font-medium">
                      Erro ao carregar documento.
                    </div>
                  }
                  options={{
                    cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
                    cMapPacked: true,
                    useSystemFonts: false,
                  }}
                  className="select-none"
                >
                  {Array.from({ length: numPages }, (_, index) => (
                    <div
                      key={index}
                      className="mb-6 last:mb-0 flex justify-center select-none"
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top center",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        MozUserSelect: "none",
                        msUserSelect: "none",
                      }}
                    >
                      <div
                        className="shadow-xl border border-border/40 rounded-md overflow-hidden bg-white select-none"
                        style={{
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          MozUserSelect: "none",
                          msUserSelect: "none",
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <Page
                          pageNumber={index + 1}
                          scale={1}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          className="select-none"
                        />
                      </div>
                    </div>
                  ))}
                </PDFDocument>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
