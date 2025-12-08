import { useState, useMemo, useCallback } from "react";
import { Folder, ChevronRight, ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/DocumentCard";
import { useRootContents, useFolderContents, useFolderPath } from "@/hooks/useFoldersQuery";
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

export function FolderNavigator({ onDocumentOpen, categoryFilter, searchTerm, onSearchTermChange }: FolderNavigatorProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
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
  const { data: folderPath } = useFolderPath(currentFolderId);

  const isLoading = shouldShowRoot ? isLoadingRoot : isLoadingFolder;
  const contents = shouldShowRoot ? rootContents : folderContents;

  // Batch fetch user likes for all documents to avoid N+1 queries
  const documentIds = useMemo(() => contents?.documents.map(doc => doc.id) || [], [contents?.documents]);
  const { data: userLikedDocuments = new Set<string>() } = useUserDocumentLikesBatch(
    documentIds,
    user?.id
  );

  const handleFolderClick = (folderId: string) => {
    // When searching, clear search and navigate to folder
    if (searchTerm && onSearchTermChange) {
      onSearchTermChange("");
    }
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    if (folderPath && folderPath.length > 0) {
      // Go to parent folder
      const parentFolder = folderPath[folderPath.length - 2];
      setCurrentFolderId(parentFolder?.id || null);
    } else {
      // Go to root
      setCurrentFolderId(null);
    }
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleDocumentClick = useCallback((document: Document) => {
    if (onDocumentOpen) {
      onDocumentOpen(document);
    } else {
      navigate(`/documents/${document.id}`);
    }
  }, [onDocumentOpen, navigate]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation - Hide when searching */}
      {!searchTerm && currentFolderId !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="h-8 px-2 text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <span className="text-muted-foreground/50">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(null)}
            className="h-8 px-2 text-xs"
          >
            Raiz
          </Button>
          {folderPath?.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(folder.id)}
                className="h-8 px-2 text-xs"
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      )}

      {/* Contents */}
      {!isLoading && contents && (
        <>
          {/* Folders */}
          {contents.folders.length > 0 && (
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {contents.folders.map((folder) => (
                <Card
                  key={folder.id}
                  className="group cursor-pointer border shadow-elegant hover:shadow-cyan hover:border-cyan/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] bg-card relative select-none"
                  onClick={() => handleFolderClick(folder.id)}
                >
                  <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
                      <Folder className="h-6 w-6 text-cyan stroke-[1.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[15px] sm:text-[17px] text-foreground truncate group-hover:text-cyan transition-colors">
                        {folder.name}
                      </h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan transition-colors flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Documents */}
          {contents.documents.length > 0 && (
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {contents.documents.map((document, index) => (
                <div
                  key={document.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                    opacity: 0,
                  }}
                >
                  <DocumentCard
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
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {contents.folders.length === 0 && contents.documents.length === 0 && (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground text-[15px] font-light">
                {searchTerm ? "Nenhum resultado encontrado" : "Esta pasta está vazia"}
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



