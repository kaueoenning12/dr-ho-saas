import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, FileText, Home, MessageSquare, MessageCircle, Megaphone, Lightbulb, CreditCard, Settings } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mockDocumentContents } from "@/lib/mockData";
import { useDocumentById, useDocuments } from "@/hooks/useDocumentsQuery";
import { CardNavigation } from "@/components/CardNavigation";
import { useDocumentUnlock } from "@/hooks/usePremiumDocuments";
import { PremiumDocumentUnlock } from "@/components/PremiumDocumentUnlock";
import { useSignedPdfUrl } from "@/hooks/useSignedPdfUrl";
import { PDFViewer } from "@/components/PDFViewer";

export default function DocumentView() {
  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: document,
    isLoading: isDocumentLoading,
  } = useDocumentById(id ?? null);

  // Check if document is unlocked (for premium documents)
  const { data: unlockData, isLoading: isUnlockLoading } = useDocumentUnlock(id ?? null);
  
  // Get related documents in the same category
  const { data: relatedDocuments = [] } = useDocuments({
    category: document?.category || "Todas",
  });

  // Filter out current document and limit to 5
  const relatedDocs = relatedDocuments
    .filter((doc) => doc.id !== document?.id)
    .slice(0, 5);

  // Check if document is premium and not unlocked
  const isPremium = document?.is_premium || false;
  const isUnlocked = !!unlockData || !isPremium;
  const shouldShowUnlockScreen = isPremium && !isUnlocked && !isUnlockLoading;

  // Generate signed URL for PDF (only if unlocked)
  const { signedUrl, isLoading: isLoadingSignedUrl } = useSignedPdfUrl(
    isUnlocked && document?.pdf_url ? document.pdf_url : null
  );

  useEffect(() => {
    if (!document) return;

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
      const forbiddenCtrlKeys = ["c", "a", "p", "s", "u", "d", "j"]; // Adiciona "d" (download) e "j" (downloads do Chrome)

      if (isCtrlOrMeta && forbiddenCtrlKeys.includes(key)) {
        e.preventDefault();
        toast.error("Esta ação está desabilitada para proteção de conteúdo.");
        return;
      }

      // Bloquear Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+S (Save Page)
      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "p" || key === "s")) {
        e.preventDefault();
        toast.error("Esta ação está desabilitada para proteção de conteúdo.");
        return;
      }

      // Bloquear F12 (DevTools), F11 (Fullscreen)
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

    const docRef = window.document;
    const winRef = window;
    const docBody = docRef.body;
    const docElement = docRef.documentElement;

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

    docRef.addEventListener("copy", handleCopy, true);
    docRef.addEventListener("contextmenu", handleContextMenu, true);
    docRef.addEventListener("selectstart", handleSelectStart, true);
    docRef.addEventListener("dragstart", handleDragStart, true);
    docRef.addEventListener("keydown", handleKeyDown, true);
    winRef.addEventListener("keydown", handleKeyDown, true);
    winRef.addEventListener("beforeprint", handleBeforePrint, true);

    return () => {
      docRef.removeEventListener("copy", handleCopy, true);
      docRef.removeEventListener("contextmenu", handleContextMenu, true);
      docRef.removeEventListener("selectstart", handleSelectStart, true);
      docRef.removeEventListener("dragstart", handleDragStart, true);
      docRef.removeEventListener("keydown", handleKeyDown, true);
      winRef.removeEventListener("keydown", handleKeyDown, true);
      winRef.removeEventListener("beforeprint", handleBeforePrint, true);
      docBody.style.userSelect = previousBodyUserSelect;
      (docBody.style as any).WebkitUserSelect = previousBodyWebkitUserSelect;
      (docBody.style as any).MozUserSelect = previousBodyMozUserSelect;
      (docBody.style as any).msUserSelect = previousBodyMsUserSelect;
      (docBody.style as any).WebkitTouchCallout = previousBodyTouchCallout;
      docElement.style.userSelect = previousHtmlUserSelect;
    };
  }, [document]);

  const hasSimulatedContent = document ? mockDocumentContents[document.id] : undefined;

  // Prepare navigation cards for CardNavigation
  const navCards = [
    {
      label: "Navegação",
      links: [
        { label: "Documentos", href: "/", icon: Home },
        { label: "Fórum", href: "/forum", icon: MessageSquare },
        { label: "WhatsApp", href: "/whatsapp-community", icon: MessageCircle },
        { label: "Avisos", href: "/announcements", icon: Megaphone },
        { label: "Sugestões", href: "/suggestions", icon: Lightbulb },
      ],
    },
    ...(relatedDocs.length > 0
      ? [
          {
            label: "Documentos Relacionados",
            links: relatedDocs.map((doc) => ({
              label: doc.title.length > 30 ? doc.title.substring(0, 30) + "..." : doc.title,
              href: `/documents/${doc.id}`,
              icon: FileText,
            })),
          },
        ]
      : []),
    {
      label: "Conta",
      links: [
        { label: "Planos", href: "/plans", icon: CreditCard },
        { label: "Configurações", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <CardNavigation
          navCards={navCards}
          showOnScroll={true}
          scrollThreshold={100}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5">
              <div className="flex items-center gap-1.5">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="h-8 px-2.5 rounded-lg text-xs sm:text-sm text-foreground/80 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              <div className="flex-1 flex items-center justify-end">
                <UserProfileMenu />
              </div>
            </div>

            <div className="px-3 sm:px-4 md:px-6 pb-3 border-t border-cyan/10">
              {isDocumentLoading ? (
                <div className="h-10 bg-muted/60 rounded-lg animate-pulse" />
              ) : document ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
                      {document.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Categoria: {document.category}
                    </p>
                  </div>
                   <Badge
                    variant="outline"
                    className="w-fit items-center gap-1.5 px-2.5 py-1 bg-cyan/10 border-cyan/20 text-cyan"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {isPremium ? "Conteúdo Premium" : "Conteúdo Protegido"}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold text-foreground">Documento não encontrado</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="h-8 px-2.5 rounded-lg text-xs sm:text-sm"
                  >
                    Voltar ao dashboard
                  </Button>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 relative bg-gradient-to-br from-muted/30 to-muted/10">
            {showProtectionWarning && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Conteúdo Protegido</span>
                </div>
              </div>
            )}

            {(isDocumentLoading || isUnlockLoading || isLoadingSignedUrl) ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan mx-auto" />
                  <p className="text-sm font-medium text-foreground">Carregando documento...</p>
                </div>
              </div>
            ) : !document ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    O documento solicitado não foi encontrado ou não está disponível.
                  </p>
                </div>
              </div>
            ) : shouldShowUnlockScreen ? (
              <div className="w-full h-full overflow-auto p-3 sm:p-8">
                <PremiumDocumentUnlock
                  documentId={document.id}
                  documentTitle={document.title}
                  previewImageUrl={document.preview_image_url}
                />
              </div>
            ) : hasSimulatedContent ? (
              <div
                className="w-full h-full overflow-auto p-3 sm:p-8 bg-card select-none relative"
                style={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
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

                <div className="max-w-4xl mx-auto relative">
                  <pre
                    className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 select-none"
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                    }}
                  >
                    {hasSimulatedContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full h-full overflow-auto"
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
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-30">
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

                <div className="relative w-full h-full">
                  {signedUrl ? (
                    <PDFViewer 
                      document={{
                        id: document.id,
                        title: document.title,
                        pdfUrl: signedUrl,
                        category: document.category,
                        keywords: [],
                        description: "",
                        publishedAt: "",
                        views: 0,
                        likes: 0,
                        comments: 0,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan mx-auto" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Gerando acesso seguro ao documento...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

