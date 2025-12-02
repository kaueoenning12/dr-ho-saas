import { useEffect, useState, useRef } from "react";
import { Shield, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import mammoth from "mammoth";

interface DocxViewerProps {
  document: {
    id: string;
    title: string;
    pdfUrl: string;
    category?: string;
  } | null;
}

export function DocxViewer({ document }: DocxViewerProps) {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingDocx, setIsFetchingDocx] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!document) return;

    setIsLoading(true);
    setIsFetchingDocx(false);
    setHtmlContent(null);

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

    const fetchAndConvertDocx = async () => {
      try {
        setIsFetchingDocx(true);
        console.log("[DocxViewer] Iniciando fetch do DOCX:", document.pdfUrl);

        // Fetch do arquivo DOCX
        const response = await fetch(document.pdfUrl);
        
        console.log("[DocxViewer] Response status:", response.status);

        if (!response.ok) {
          throw new Error(`Erro ao buscar DOCX: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log("[DocxViewer] DOCX arrayBuffer criado, tamanho:", arrayBuffer.byteLength, "bytes");
        
        // Converter DOCX para HTML usando mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log("[DocxViewer] DOCX convertido para HTML com sucesso");
        
        setHtmlContent(result.value);
        setIsLoading(false);
      } catch (error: any) {
        console.error("[DocxViewer] Erro completo:", {
          message: error.message,
          stack: error.stack,
          url: document.pdfUrl
        });
        toast.error("Erro ao carregar o documento. Tente novamente.");
        setIsLoading(false);
      } finally {
        setIsFetchingDocx(false);
      }
    };

    fetchAndConvertDocx();
  }, [document]);

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

      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-50 relative">
        {showProtectionWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Conteúdo Protegido</span>
            </div>
          </div>
        )}

        {(isLoading || isFetchingDocx) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-cyan mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">
                {isFetchingDocx ? "Carregando documento..." : "Renderizando documento..."}
              </p>
            </div>
          </div>
        )}

        {htmlContent && (
          <div 
            className="relative w-full h-full p-4 sm:p-8"
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

            {/* Conteúdo do documento */}
            <div className="relative z-10 max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 sm:p-12">
              <div 
                className="prose dark:prose-invert max-w-none"
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
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}









