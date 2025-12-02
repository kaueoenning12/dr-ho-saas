import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, FileText, Home, MessageSquare, MessageCircle, Megaphone, Lightbulb, CreditCard, Settings, Download, Heart, Eye } from "lucide-react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mockDocumentContents } from "@/lib/mockData";
import { useDocumentById, useDocuments, useTrackDocumentView, useDocumentLikes, useUserDocumentLike, useToggleDocumentLike } from "@/hooks/useDocumentsQuery";
import { CardNavigation } from "@/components/CardNavigation";
import { useDocumentUnlock } from "@/hooks/usePremiumDocuments";
import { PremiumDocumentUnlock } from "@/components/PremiumDocumentUnlock";
import { useSignedPdfUrl } from "@/hooks/useSignedPdfUrl";
import { PDFViewer } from "@/components/PDFViewer";
import { DocxViewer } from "@/components/DocxViewer";
import { ImageViewer } from "@/components/ImageViewer";
import { DocumentComments } from "@/components/DocumentComments";

function DocumentViewContent() {
  const { setOpen } = useSidebar();
  
  // Colapsar sidebar automaticamente quando o componente monta
  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const [showProtectionWarning, setShowProtectionWarning] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: document,
    isLoading: isDocumentLoading,
  } = useDocumentById(id ?? null);

  // Track document view
  const trackViewMutation = useTrackDocumentView();
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track view when document is loaded (only once per session)
  useEffect(() => {
    if (document && !hasTrackedView && user) {
      trackViewMutation.mutate(document.id, {
        onSuccess: () => {
          setHasTrackedView(true);
        },
        onError: (error) => {
          console.error("Error tracking view:", error);
        },
      });
    }
  }, [document, user, hasTrackedView, trackViewMutation]);

  // Document likes
  const { data: totalLikes = 0, isLoading: isLoadingLikes } = useDocumentLikes(id ?? "");
  const { data: userLike, isLoading: isLoadingUserLike } = useUserDocumentLike(id ?? "", user?.id);
  const toggleLikeMutation = useToggleDocumentLike();
  const [liked, setLiked] = useState(false);

  // Sync liked state with database
  useEffect(() => {
    if (!isLoadingUserLike) {
      setLiked(!!userLike);
    }
  }, [userLike, isLoadingUserLike]);

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
  const { signedUrl, isLoading: isLoadingSignedUrl, error: signedUrlError } = useSignedPdfUrl(
    isUnlocked && document?.pdf_url ? document.pdf_url : null
  );

  // Helper function to detect file type
  const getFileType = (url: string | null | undefined): 'pdf' | 'docx' | 'image' | 'other' => {
    if (!url) return 'other';
    // Remove query params and check extension
    const urlWithoutParams = url.split('?')[0].toLowerCase();
    
    // PDF files
    if (urlWithoutParams.endsWith('.pdf')) return 'pdf';
    
    // Word documents
    if (urlWithoutParams.endsWith('.docx') || urlWithoutParams.endsWith('.doc')) return 'docx';
    
    // Image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    if (imageExtensions.some(ext => urlWithoutParams.endsWith(ext))) return 'image';
    
    return 'other';
  };

  const fileType = document?.pdf_url ? getFileType(document.pdf_url) : 'other';
  const isDocumentPdf = fileType === 'pdf';
  const isDocumentDocx = fileType === 'docx';
  const isDocumentImage = fileType === 'image';

  // Memoize document object for PDFViewer to prevent re-renders
  const pdfViewerDocument = useMemo(() => {
    if (!document || !signedUrl) return null;
    return {
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
    };
  }, [document?.id, document?.title, signedUrl, document?.category]);

  const docxViewerDocument = useMemo(() => {
    if (!document || !signedUrl) return null;
    return {
      id: document.id,
      title: document.title,
      pdfUrl: signedUrl,
      category: document.category,
    };
  }, [document?.id, document?.title, signedUrl, document?.category]);

  const imageViewerDocument = useMemo(() => {
    if (!document || !signedUrl) return null;
    return {
      id: document.id,
      title: document.title,
      pdfUrl: signedUrl,
      category: document.category,
    };
  }, [document?.id, document?.title, signedUrl, document?.category]);

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

  const handleLike = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para curtir documentos");
      return;
    }

    if (!id) return;

    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);

    try {
      const newLikedState = await toggleLikeMutation.mutateAsync({
        documentId: id,
        userId: user.id,
      });
      setLiked(newLikedState);
    } catch (error: any) {
      // Revert on error
      setLiked(wasLiked);
      toast.error("Erro ao curtir documento. Tente novamente.");
      console.error("Erro ao dar like:", error);
    }
  };

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
                <div className="flex flex-col gap-3">
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
                  {/* Stats and actions */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>{document.views || 0} visualizações</span>
                    </div>
                    <button
                      onClick={handleLike}
                      disabled={toggleLikeMutation.isPending || !user || isLoadingLikes || isLoadingUserLike}
                      className="flex items-center gap-1.5 hover:text-aqua transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Heart
                        className={`h-4 w-4 transition-all ${
                          liked
                            ? "fill-aqua text-aqua scale-110"
                            : "hover:scale-110"
                        }`}
                      />
                      <span>{totalLikes || 0} curtidas</span>
                    </button>
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="flex items-center gap-1.5 hover:text-cyan transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{document.comments || 0} comentários</span>
                    </button>
                  </div>
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
                  {signedUrlError ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4 max-w-md px-4">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Erro ao carregar documento
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {signedUrlError}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="w-full"
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : signedUrl ? (
                    isDocumentPdf ? (
                      <PDFViewer 
                        document={pdfViewerDocument}
                      />
                    ) : isDocumentDocx ? (
                      <DocxViewer 
                        document={docxViewerDocument}
                      />
                    ) : isDocumentImage ? (
                      <ImageViewer 
                        document={imageViewerDocument}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-6 max-w-lg px-4">
                          <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
                            <FileText className="h-16 w-16 text-cyan mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {document.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6">
                              Este arquivo não pode ser visualizado diretamente no navegador.
                              Faça o download para abrir com o aplicativo apropriado.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Button
                                onClick={() => {
                                  if (signedUrl) {
                                    const link = window.document.createElement('a');
                                    link.href = signedUrl;
                                    link.download = document?.title || 'document';
                                    link.target = '_blank';
                                    window.document.body.appendChild(link);
                                    link.click();
                                    window.document.body.removeChild(link);
                                  }
                                }}
                                className="bg-cyan hover:bg-cyan/90 text-white"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar Documento
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => navigate(-1)}
                              >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
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

          {/* Comments section - only show when button is clicked */}
          {document && !shouldShowUnlockScreen && showComments && (
            <DocumentComments documentId={document.id} />
          )}
      </main>
    </div>
  );
}

export default function DocumentView() {
  return (
    <SidebarProvider defaultOpen={false}>
      <DocumentViewContent />
    </SidebarProvider>
  );
}

