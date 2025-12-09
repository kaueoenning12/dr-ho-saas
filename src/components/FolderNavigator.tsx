import { useState, useMemo, useCallback, useEffect } from "react";
import { Folder, ChevronRight, FileText, FolderOpen, Grid3x3, List as ListIcon, LayoutGrid, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentCard } from "@/components/DocumentCard";
import { useRootContents, useFolderContents, getFolderItemCounts, useRecursiveDocuments, type FolderItemCounts } from "@/hooks/useFoldersQuery";
import { useUserDocumentLikesBatch } from "@/hooks/useDocumentsQuery";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

type Document = Database["public"]["Tables"]["documents"]["Row"];
type Folder = Database["public"]["Tables"]["document_folders"]["Row"];

interface FolderNavigatorProps {
  onDocumentOpen?: (document: Document) => void;
  categoryFilter?: string;
  searchTerm?: string;
  onSearchTermChange?: (searchTerm: string) => void;
}

type ViewFilter = "all" | "folders" | "documents";
type ViewMode = "cards" | "list";

export function FolderNavigator({ onDocumentOpen, categoryFilter, searchTerm, onSearchTermChange }: FolderNavigatorProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAllDocumentsRecursive, setShowAllDocumentsRecursive] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, FolderItemCounts>>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  // When searching, always show root contents (search mode)
  // When not searching, show current folder contents (navigation mode)
  const shouldShowRoot = searchTerm ? true : currentFolderId === null;
  
  const { data: rootContents, isLoading: isLoadingRoot } = useRootContents(categoryFilter, searchTerm);
  const { data: folderContents, isLoading: isLoadingFolder } = useFolderContents(
    searchTerm ? null : currentFolderId, 
    categoryFilter, 
    searchTerm
  );
  
  // Fetch recursive documents when showAllDocumentsRecursive is enabled
  const { data: recursiveDocuments = [], isLoading: isLoadingRecursive } = useRecursiveDocuments(
    showAllDocumentsRecursive ? (searchTerm ? null : currentFolderId) : null,
    categoryFilter
  );

  const isLoading = shouldShowRoot ? isLoadingRoot : isLoadingFolder;
  const contents = shouldShowRoot ? rootContents : folderContents;

  // Determine which documents to use
  const documentsToDisplay = useMemo(() => {
    if (showAllDocumentsRecursive && !searchTerm) {
      return recursiveDocuments;
    }
    return contents?.documents || [];
  }, [showAllDocumentsRecursive, searchTerm, recursiveDocuments, contents?.documents]);

  // Batch fetch user likes for all documents to avoid N+1 queries
  const documentIds = useMemo(() => documentsToDisplay.map(doc => doc.id), [documentsToDisplay]);
  const { data: userLikedDocuments = new Set<string>() } = useUserDocumentLikesBatch(
    documentIds,
    user?.id
  );

  // Fetch folder counts when folders change
  useEffect(() => {
    if (!contents?.folders || contents.folders.length === 0) {
      setFolderCounts({});
      return;
    }

    const fetchCounts = async () => {
      const counts: Record<string, FolderItemCounts> = {};
      await Promise.all(
        contents.folders.map(async (folder) => {
          try {
            counts[folder.id] = await getFolderItemCounts(folder.id);
          } catch (error) {
            console.error(`Error fetching counts for folder ${folder.id}:`, error);
            counts[folder.id] = { documents: 0, subfolders: 0 };
          }
        })
      );
      setFolderCounts(counts);
    };

    fetchCounts();
  }, [contents?.folders]);

  const handleFolderClick = (folderId: string) => {
    // When searching, clear search and navigate to folder
    if (searchTerm && onSearchTermChange) {
      onSearchTermChange("");
    }
    setCurrentFolderId(folderId);
  };

  const handleDocumentClick = useCallback((document: Document) => {
    if (onDocumentOpen) {
      onDocumentOpen(document);
    } else {
      navigate(`/documents/${document.id}`);
    }
  }, [onDocumentOpen, navigate]);

  // Filter contents based on view filter
  const filteredFolders = useMemo(() => {
    if (!contents) return [];
    if (viewFilter === "documents" || showAllDocumentsRecursive) return [];
    return contents.folders;
  }, [contents, viewFilter, showAllDocumentsRecursive]);

  const filteredDocuments = useMemo(() => {
    if (showAllDocumentsRecursive && !searchTerm) {
      // When showing recursive documents, ignore viewFilter
      return documentsToDisplay;
    }
    if (!contents) return [];
    if (viewFilter === "documents") return contents.documents;
    // viewFilter === "all" - show both folders and documents
    return contents.documents;
  }, [contents, viewFilter, showAllDocumentsRecursive, documentsToDisplay, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search Results Header - Show when searching */}
      {searchTerm && contents && (contents.folders.length > 0 || contents.documents.length > 0) && (
        <div className="bg-cyan/5 border border-cyan/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-foreground font-medium mb-2">
            Resultados da busca por: <span className="text-cyan font-semibold">"{searchTerm}"</span>
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {contents.folders.length > 0 && (
              <span className="flex items-center gap-1">
                <Folder className="h-3 w-3 text-cyan" />
                {contents.folders.length} {contents.folders.length === 1 ? "pasta encontrada" : "pastas encontradas"}
              </span>
            )}
            {contents.documents.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-cyan" />
                {contents.documents.length} {contents.documents.length === 1 ? "documento encontrado" : "documentos encontrados"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Back Button - Show when inside a folder */}
      {!searchTerm && currentFolderId && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(null)}
            className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      )}

      {/* View Controls - Only show when not searching */}
      {!searchTerm && contents && (contents.folders.length > 0 || contents.documents.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-border/50">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("cards")}
              className={`h-7 px-3 text-xs ${viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Grid3x3 className="h-3 w-3 mr-1" />
              Cards
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-7 px-3 text-xs ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <ListIcon className="h-3 w-3 mr-1" />
              Lista
            </Button>
          </div>

          {/* View Mode Toggle - Organizados por tópico / Todos os documentos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllDocumentsRecursive(!showAllDocumentsRecursive)}
            className="h-7 px-3 text-xs"
          >
            {showAllDocumentsRecursive ? (
              <>
                <LayoutGrid className="h-3 w-3 mr-1" />
                Organizados por tópico
              </>
            ) : (
              <>
                <FileText className="h-3 w-3 mr-1" />
                Mostrar todos os documentos
              </>
            )}
          </Button>

          {/* View Filter Buttons - Only show "Apenas Documentos" when not in recursive mode */}
          {!showAllDocumentsRecursive && contents.documents.length > 0 && (
            <Button
              variant={viewFilter === "documents" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewFilter(viewFilter === "documents" ? "all" : "documents")}
              className={`h-7 px-3 text-xs ${viewFilter === "documents" ? "bg-cyan/20 text-cyan border-cyan/30" : ""}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              Apenas Documentos ({contents.documents.length})
            </Button>
          )}
        </div>
      )}

      {/* Loading State */}
      {(isLoading || (showAllDocumentsRecursive && isLoadingRecursive)) && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      )}

      {/* Contents */}
      {!isLoading && !(showAllDocumentsRecursive && isLoadingRecursive) && contents && (
        <>
          {viewMode === "cards" ? (
            <>
              {/* Folders Section - Cards View */}
              {filteredFolders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-4 w-4 text-cyan" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Pastas {filteredFolders.length > 0 && `(${filteredFolders.length})`}
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFolders.map((folder) => {
                      const counts = folderCounts[folder.id] || { documents: 0, subfolders: 0 };
                      return (
                        <Card
                          key={folder.id}
                          className="group cursor-pointer border-2 border-cyan/20 shadow-elegant hover:shadow-cyan hover:border-cyan/50 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-cyan/5 to-transparent relative select-none"
                          onClick={() => handleFolderClick(folder.id)}
                        >
                          <CardContent className="p-5 sm:p-6">
                            <div className="flex items-start gap-4">
                              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/10 flex items-center justify-center flex-shrink-0 border border-cyan/30">
                                <Folder className="h-7 w-7 text-cyan stroke-[1.5]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[16px] sm:text-[18px] text-foreground mb-2 group-hover:text-cyan transition-colors line-clamp-2">
                                  {folder.name}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {counts.documents > 0 && (
                                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-cyan/10 text-cyan border-cyan/30">
                                      {counts.documents} {counts.documents === 1 ? "documento" : "documentos"}
                                    </Badge>
                                  )}
                                  {counts.subfolders > 0 && (
                                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
                                      {counts.subfolders} {counts.subfolders === 1 ? "pasta" : "pastas"}
                                    </Badge>
                                  )}
                                  {counts.documents === 0 && counts.subfolders === 0 && (
                                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-muted-foreground">
                                      Vazia
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documents Section - Cards View */}
              {filteredDocuments.length > 0 && (
                <div className={`space-y-3 ${filteredFolders.length > 0 ? "mt-8 pt-6 border-t border-border/50" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-cyan" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Documentos {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDocuments.map((document) => (
                      <DocumentCard
                        key={document.id}
                        document={{
                          id: document.id,
                          title: document.title,
                          description: document.description,
                          category: document.category,
                          keywords: document.keywords || [],
                          pdfUrl: document.pdf_url,
                          publishedAt: document.published_at,
                          views: (document as any).views || 0,
                          likes: (document as any).likes || 0,
                          comments: (document as any).comments || 0,
                        }}
                        onOpen={(doc) => handleDocumentClick({
                          ...document,
                          file_size: document.file_size || null,
                          folder_path: document.folder_path || null,
                          is_premium: document.is_premium || false,
                          preview_image_url: document.preview_image_url || null,
                          salvo_rag: document.salvo_rag || false,
                          search_vector: null,
                          thumbnail_url: document.thumbnail_url || null,
                        } as Document)}
                        isLiked={userLikedDocuments.has(document.id)}
                        likesCount={(document as any).likes || 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* List View */}
              <div className="space-y-1">
                {/* Folders in List View */}
                {filteredFolders.map((folder) => {
                  const counts = folderCounts[folder.id] || { documents: 0, subfolders: 0 };
                  return (
                    <div
                      key={folder.id}
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-cyan/30 cursor-pointer transition-all duration-200"
                      onClick={() => handleFolderClick(folder.id)}
                    >
                      <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
                        <Folder className="h-5 w-5 text-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[15px] text-foreground group-hover:text-cyan transition-colors truncate">
                          {folder.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {counts.documents > 0 && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-cyan/10 text-cyan border-cyan/30">
                            {counts.documents} {counts.documents === 1 ? "doc" : "docs"}
                          </Badge>
                        )}
                        {counts.subfolders > 0 && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
                            {counts.subfolders} {counts.subfolders === 1 ? "pasta" : "pastas"}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan transition-colors" />
                      </div>
                    </div>
                  );
                })}

                {/* Documents in List View */}
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-cyan/30 transition-all duration-200"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[15px] text-foreground group-hover:text-cyan transition-colors truncate">
                        {document.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {document.category && (
                        <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                          {document.category}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDocumentClick({
                          ...document,
                          file_size: document.file_size || null,
                          folder_path: document.folder_path || null,
                          is_premium: document.is_premium || false,
                          preview_image_url: document.preview_image_url || null,
                          salvo_rag: document.salvo_rag || false,
                          search_vector: null,
                          thumbnail_url: document.thumbnail_url || null,
                        } as Document)}
                        className="h-7 px-3 text-xs"
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {filteredFolders.length === 0 && filteredDocuments.length === 0 && (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground text-[15px] font-light">
                {searchTerm 
                  ? "Nenhum resultado encontrado" 
                  : viewFilter === "documents"
                    ? "Nenhum documento encontrado"
                    : "Esta pasta está vazia"}
              </p>
              {searchTerm && (
                <p className="text-muted-foreground/60 text-[13px] font-light mt-2">
                  Tente ajustar seus termos de busca
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}



