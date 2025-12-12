import { useState, useMemo, useCallback, useEffect } from "react";
import { Folder, ChevronRight, FileText, FolderOpen, Grid3x3, List as ListIcon, LayoutGrid, ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentCard } from "@/components/DocumentCard";
import { useRootContents, useFolderContents, getFolderItemCounts, useRecursiveDocuments, type FolderItemCounts } from "@/hooks/useFoldersQuery";
import { useUserDocumentLikesBatch } from "@/hooks/useDocumentsQuery";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "@/lib/utils";
import { useBatchFolderFavorites, useToggleFolderFavorite, useBatchDocumentFavorites, useAllDocumentFavorites, useAllFolderFavorites, useAllFavoriteDocuments } from "@/hooks/useFavorites";
import { useBatchFolderCompletions, useToggleFolderCompletion } from "@/hooks/useFolderCompletions";
import { toast } from "sonner";

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
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
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
  
  // Fetch all favorites when filtering is active, otherwise use batch for current items
  const { data: allUserFavoriteDocuments = new Set<string>() } = useAllDocumentFavorites(
    showOnlyFavorites ? user?.id : undefined
  );
  const { data: allUserFavoriteFolders = new Set<string>() } = useAllFolderFavorites(
    showOnlyFavorites ? user?.id : undefined
  );
  
  // Fetch all favorite documents when filtering (to show documents from all folders)
  const { data: allFavoriteDocumentsList = [] } = useAllFavoriteDocuments(
    showOnlyFavorites ? user?.id : undefined
  );
  
  // Batch fetch document favorites (for display purposes when not filtering)
  const { data: userFavoriteDocuments = new Set<string>() } = useBatchDocumentFavorites(
    documentIds,
    showOnlyFavorites ? undefined : user?.id
  );

  // Filter contents based on view filter (first pass - without favorites filter)
  const baseFilteredFolders = useMemo(() => {
    if (!contents) return [];
    if (viewFilter === "documents" || showAllDocumentsRecursive) return [];
    return contents.folders;
  }, [contents, viewFilter, showAllDocumentsRecursive]);

  // Batch fetch folder favorites and completions (using base folders)
  const folderIds = useMemo(() => baseFilteredFolders.map(folder => folder.id), [baseFilteredFolders]);
  const { data: userFavoriteFolders = new Set<string>() } = useBatchFolderFavorites(
    folderIds,
    showOnlyFavorites ? undefined : user?.id
  );
  
  // Use all favorites when filtering, otherwise use batch favorites
  const effectiveFavoriteFolders = showOnlyFavorites ? allUserFavoriteFolders : userFavoriteFolders;
  const effectiveFavoriteDocuments = showOnlyFavorites ? allUserFavoriteDocuments : userFavoriteDocuments;
  const { data: userCompletedFolders = new Set<string>() } = useBatchFolderCompletions(
    folderIds,
    user?.id
  );

  // Apply favorites filter to folders (second pass)
  const filteredFolders = useMemo(() => {
    let folders = baseFilteredFolders;
    
    // Filter by favorites if requested
    if (showOnlyFavorites) {
      folders = folders.filter(folder => effectiveFavoriteFolders.has(folder.id));
    }
    
    return folders;
  }, [baseFilteredFolders, showOnlyFavorites, effectiveFavoriteFolders]);

  // Mutations for favorites and completions
  const toggleFavoriteMutation = useToggleFolderFavorite();
  const toggleCompletionMutation = useToggleFolderCompletion();

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

  const filteredDocuments = useMemo(() => {
    // When filtering by favorites, show all favorite documents regardless of folder
    if (showOnlyFavorites) {
      return allFavoriteDocumentsList;
    }
    
    // Otherwise, show documents from current folder/contents
    let docs: Document[] = [];
    
    if (showAllDocumentsRecursive && !searchTerm) {
      // When showing recursive documents, ignore viewFilter
      docs = documentsToDisplay;
    } else {
      if (!contents) return [];
      if (viewFilter === "folders") return [];
      docs = contents.documents || [];
    }
    
    return docs;
  }, [contents, viewFilter, showAllDocumentsRecursive, documentsToDisplay, searchTerm, showOnlyFavorites, allFavoriteDocumentsList]);

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
                {contents.documents.length} {contents.documents.length === 1 ? "relatório encontrado" : "relatórios encontrados"}
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
      {!searchTerm && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-3 border-b border-border/50">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("cards")}
              className={`h-7 px-3 text-xs transition-all duration-200 ${
                viewMode === "cards" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3x3 className="h-3 w-3 mr-1" />
              Cards
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-7 px-3 text-xs transition-all duration-200 ${
                viewMode === "list" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListIcon className="h-3 w-3 mr-1" />
              Lista
            </Button>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50" />

          {/* View Mode Toggle - Organizados por tópico / Todos os relatórios */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAllDocumentsRecursive(!showAllDocumentsRecursive);
              setShowOnlyFavorites(false);
            }}
            className={`h-7 px-3 text-xs transition-all duration-300 hover:scale-105 active:scale-95 ${
              showAllDocumentsRecursive 
                ? "bg-cyan/10 border-cyan/30 text-cyan hover:bg-cyan/15" 
                : "hover:bg-muted/50"
            }`}
          >
            {showAllDocumentsRecursive ? (
              <>
                <LayoutGrid className="h-3 w-3 mr-1" />
                Organizados por tópico
              </>
            ) : (
              <>
                <FileText className="h-3 w-3 mr-1" />
                Mostrar todos os relatórios
              </>
            )}
          </Button>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50" />

          {/* Favorites Filter */}
          <Button
            variant={showOnlyFavorites ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowOnlyFavorites(!showOnlyFavorites);
              setShowAllDocumentsRecursive(false);
            }}
            disabled={!user}
            className={`h-7 px-3 text-xs transition-all duration-300 hover:scale-105 active:scale-95 ${
              showOnlyFavorites
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-400/90 hover:to-orange-500/90 shadow-md hover:shadow-lg border-0"
                : "hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
            title={!user ? "Faça login para usar favoritos" : showOnlyFavorites ? "Mostrar todos os itens" : "Mostrar apenas favoritos"}
          >
            <Star className={`h-3 w-3 mr-1 transition-transform duration-300 ${showOnlyFavorites ? 'fill-yellow-400 animate-pulse' : ''}`} />
            {showOnlyFavorites ? "Todos os favoritos" : "Apenas favoritos"}
          </Button>

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
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      Relatórios {filteredFolders.length > 0 && `(${filteredFolders.length})`}
                    </h2>
                    {filteredFolders.length > 0 && (() => {
                      // Encontrar a pasta com o update mais recente
                      const mostRecentUpdate = filteredFolders.reduce((latest, folder) => {
                        const folderDate = folder.updated_at && folder.updated_at !== folder.created_at 
                          ? new Date(folder.updated_at) 
                          : new Date(folder.created_at);
                        const latestDate = latest ? new Date(latest) : null;
                        return !latestDate || folderDate > latestDate ? folder.updated_at || folder.created_at : latest;
                      }, null as string | null);
                      
                      if (mostRecentUpdate) {
                        const date = new Date(mostRecentUpdate);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        
                        let timeAgo = '';
                        if (diffHours < 1) {
                          timeAgo = 'há pouco';
                        } else if (diffHours < 24) {
                          timeAgo = `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                        } else if (diffDays < 30) {
                          timeAgo = `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
                        } else {
                          const diffMonths = Math.floor(diffDays / 30);
                          timeAgo = `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
                        }
                        
                        return (
                          <span className="text-xs text-muted-foreground/60 font-light">
                            Última atualização: {timeAgo}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFolders.map((folder) => {
                      const counts = folderCounts[folder.id] || { documents: 0, subfolders: 0 };
                      const totalRelatorios = counts.documents;
                      const isFavorited = effectiveFavoriteFolders.has(folder.id);
                      const isCompleted = userCompletedFolders.has(folder.id);
                      
                      // Usar updated_at se disponível, senão usar created_at
                      const dateToShow = folder.updated_at && folder.updated_at !== folder.created_at 
                        ? folder.updated_at 
                        : folder.created_at;
                      
                      // Formatar data relativa no formato "há X hora/dia"
                      let timeAgo = '';
                      if (dateToShow) {
                        const date = new Date(dateToShow);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        
                        if (diffHours < 1) {
                          timeAgo = 'há pouco';
                        } else if (diffHours < 24) {
                          timeAgo = `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                        } else if (diffDays < 30) {
                          timeAgo = `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
                        } else {
                          const diffMonths = Math.floor(diffDays / 30);
                          timeAgo = `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
                        }
                      }

                      const handleFavoriteClick = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!user) {
                          toast.error("Você precisa estar logado para favoritar pastas");
                          return;
                        }
                        try {
                          await toggleFavoriteMutation.mutateAsync({
                            folderId: folder.id,
                            userId: user.id,
                          });
                        } catch (error) {
                          toast.error("Erro ao favoritar pasta. Tente novamente.");
                        }
                      };

                      const handleCompletionClick = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!user) {
                          toast.error("Você precisa estar logado para marcar pastas como concluídas");
                          return;
                        }
                        try {
                          await toggleCompletionMutation.mutateAsync({
                            folderId: folder.id,
                            userId: user.id,
                          });
                        } catch (error) {
                          toast.error("Erro ao marcar pasta como concluída. Tente novamente.");
                        }
                      };

                      return (
                        <Card
                          key={folder.id}
                          className={`group cursor-pointer border-2 shadow-elegant hover:shadow-cyan transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-cyan/5 to-transparent relative select-none min-h-[140px] sm:min-h-[160px] ${
                            isCompleted 
                              ? "border-green-500/30 hover:border-green-500/50" 
                              : "border-cyan/20 hover:border-cyan/50"
                          }`}
                          onClick={() => handleFolderClick(folder.id)}
                        >
                          <CardContent className="p-5 sm:p-6 h-full flex flex-col">
                            {/* Topo: Data à esquerda, Botões à direita */}
                            <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                              {/* Data no canto superior esquerdo */}
                              <div className="flex flex-col gap-1">
                                {timeAgo && (
                                  <span className="text-[10px] sm:text-[11px] text-muted-foreground/60 font-light">
                                    {timeAgo}
                                  </span>
                                )}
                                {/* Indicador de concluído abaixo da data */}
                                {isCompleted && (
                                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[9px] px-1.5 py-0.5 w-fit">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                    Concluído
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Botões no canto superior direito */}
                              <div className="flex items-center gap-1">
                                {/* Botão de concluído */}
                                <button
                                  onClick={handleCompletionClick}
                                  disabled={toggleCompletionMutation.isPending || !user}
                                  className="p-1.5 rounded-md hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10 flex-shrink-0"
                                  title={isCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
                                >
                                  <CheckCircle2 
                                    className={`h-4 w-4 transition-colors ${
                                      isCompleted 
                                        ? "fill-green-500 text-green-500" 
                                        : "text-muted-foreground/60 group-hover:text-green-500"
                                    }`}
                                  />
                                </button>
                                
                                {/* Botão de favorito */}
                                <button
                                  onClick={handleFavoriteClick}
                                  disabled={toggleFavoriteMutation.isPending || !user}
                                  className="p-1.5 rounded-md hover:bg-cyan/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10 flex-shrink-0"
                                  title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                >
                                  <Star 
                                    className={`h-4 w-4 transition-colors ${
                                      isFavorited 
                                        ? "fill-yellow-400 text-yellow-400" 
                                        : "text-muted-foreground/60 group-hover:text-yellow-400"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                            
                            {/* Nome da pasta ocupando o espaço principal */}
                            <div className="flex-1 flex items-center pt-6">
                              <h3 className="font-semibold text-[16px] sm:text-[18px] md:text-[20px] text-foreground group-hover:text-cyan transition-colors leading-tight line-clamp-3">
                                {folder.name}
                              </h3>
                            </div>
                            
                            {/* Número + "Relatórios" pequeno no canto inferior direito */}
                            <div className="mt-auto pt-2 flex justify-end items-baseline gap-1">
                              <span className="text-[11px] sm:text-[12px] font-semibold text-cyan group-hover:text-cyan/80 transition-colors">
                                {totalRelatorios}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wide">
                                {totalRelatorios === 1 ? "Relatório" : "Relatórios"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Relatórios Section - Cards View */}
              {filteredDocuments.length > 0 && (
                <div className={`space-y-3 ${filteredFolders.length > 0 ? "mt-8 pt-6 border-t border-border/50" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-cyan" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Relatórios {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
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
                        isFavorited={userFavoriteDocuments.has(document.id)}
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
                            {counts.documents} {counts.documents === 1 ? "relatório" : "relatórios"}
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

                {/* Relatórios in List View */}
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
                  : showOnlyFavorites
                    ? "Nenhum favorito encontrado"
                    : viewFilter === "documents"
                      ? "Nenhum relatório encontrado"
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



