import { useEffect, useState } from "react";
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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url,
).toString();

interface PDFViewerProps {
  document: ViewerDocument | null;
}

export function PDFViewer({ document }: PDFViewerProps) {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPdf, setIsFetchingPdf] = useState(false);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
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

  useEffect(() => {
    if (!document) return;

    const hasSimulatedContent = mockDocumentContents[document.id];
    if (hasSimulatedContent) {
      setIsLoading(false);
      setIsFetchingPdf(false);
      return;
    }

    const fetchPdfAsBlob = async () => {
      try {
        setIsFetchingPdf(true);

        const response = await fetch(document.pdfUrl, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Erro ao buscar PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        setPdfSource(objectUrl);
        setIsLoading(false);
      } catch (error: any) {
        console.error("[PDFViewer] Erro ao carregar PDF:", error);
        toast.error("Erro ao carregar o PDF. Tente novamente.");
        setIsLoading(false);
      } finally {
        setIsFetchingPdf(false);
      }
    };

    fetchPdfAsBlob();
  }, [document]);

  useEffect(() => {
    return () => {
      if (pdfSource?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfSource);
      }
    };
  }, [pdfSource]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleZoomReset = () => {
    setScale(1);
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
          Zoom: {(scale * 100).toFixed(0)}%
        </span>
      </div>

      <div className="flex-1 overflow-auto bg-gradient-to-br from-muted/30 to-muted/10 relative">
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
                className="flex flex-col items-center py-4 space-y-4"
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
                      className="mb-4 shadow-lg"
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                      }}
                    >
                      <Page
                        pageNumber={index + 1}
                        scale={scale}
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
