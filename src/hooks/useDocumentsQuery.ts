import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Normalize category name for comparison (remove accents, lowercase, trim)
 */
function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

/**
 * Generate signed URL for private document
 */
async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Se já é uma URL completa, não precisa gerar signed URL
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('[Documents] Error generating signed URL:', error);
      return filePath; // Fallback to original path
    }
    
    return data?.signedUrl || filePath;
  } catch (error) {
    console.error('[Documents] Exception generating signed URL:', error);
    return filePath;
  }
}

export interface DocumentFilters {
  category?: string;
  searchTerm?: string;
  showOnlyNew?: boolean;
  folderId?: string | null;
  parentFolderId?: string | null;
}

export interface DocumentStats {
  views: number;
  likes: number;
  comments: number;
}

// Fetch statistics for multiple documents
export async function fetchDocumentsStats(documentIds: string[]): Promise<Record<string, DocumentStats>> {
  if (documentIds.length === 0) return {};

  // Fetch views count grouped by document_id
  const { data: viewsData, error: viewsError } = await supabase
    .from("document_views")
    .select("document_id")
    .in("document_id", documentIds);

  if (viewsError) {
    console.error("Error fetching views:", viewsError);
  }

  // Fetch likes count grouped by document_id
  const { data: likesData, error: likesError } = await supabase
    .from("document_likes")
    .select("document_id")
    .in("document_id", documentIds);

  if (likesError) {
    console.error("Error fetching likes:", likesError);
  }

  // Fetch comments count grouped by document_id
  const { data: commentsData, error: commentsError } = await supabase
    .from("document_comments")
    .select("document_id")
    .in("document_id", documentIds);

  if (commentsError) {
    console.error("Error fetching comments:", commentsError);
  }

  // Initialize stats object with zeros
  const stats: Record<string, DocumentStats> = {};
  documentIds.forEach((id) => {
    stats[id] = { views: 0, likes: 0, comments: 0 };
  });

  // Count views
  if (viewsData) {
    viewsData.forEach((view) => {
      if (view.document_id && stats[view.document_id]) {
        stats[view.document_id].views++;
      }
    });
  }

  // Count likes
  if (likesData) {
    likesData.forEach((like) => {
      if (like.document_id && stats[like.document_id]) {
        stats[like.document_id].likes++;
      }
    });
  }

  // Count comments
  if (commentsData) {
    commentsData.forEach((comment) => {
      if (comment.document_id && stats[comment.document_id]) {
        stats[comment.document_id].comments++;
      }
    });
  }

  return stats;
}

// Fetch all published documents
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      // Note: Não aplicamos filtro de categoria aqui porque vamos fazer comparação case-insensitive
      // no JavaScript após buscar os dados, já que o método .ilike() pode não estar disponível
      // no cliente Supabase JavaScript

      if (filters?.searchTerm) {
        query = query.textSearch("search_vector", filters.searchTerm);
      }

      if (filters?.showOnlyNew) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte("published_at", thirtyDaysAgo.toISOString());
      }

      // Only apply folder filters if the columns exist (to avoid errors before migration)
      // Skip folder filters if not provided to avoid errors
      // IMPORTANTE: Se há busca, não aplicar filtro de pasta para buscar em todos os documentos
      if (!filters?.searchTerm) {
        if (filters?.folderId !== undefined && filters.folderId !== null) {
          query = query.eq("parent_folder_id", filters.folderId);
        } else if (filters?.parentFolderId !== undefined && filters.parentFolderId !== null) {
          query = query.eq("parent_folder_id", filters.parentFolderId);
        } else if (filters?.parentFolderId === null) {
          // Filtrar apenas documentos na raiz (sem pasta pai)
          query = query.is("parent_folder_id", null);
        }
      }
      // This means all documents will be shown until migration is run

      const { data, error } = await query;
      
      // If error is about missing column, return all documents (backward compatibility)
      if (error) {
        // If error is about textSearch, try JavaScript fallback
        if (filters?.searchTerm && (error.message?.includes('textSearch') || error.message?.includes('search_vector'))) {
          console.warn("[useDocuments] textSearch failed, using JavaScript fallback:", error);
          // Fallback: fetch all documents and filter in JavaScript
          const { data: allData, error: allError } = await supabase
            .from("documents")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false });
          
          if (allError) throw allError;
          
          const searchTermLower = filters.searchTerm.toLowerCase();
          const filteredDocs = (allData || []).filter((doc: any) => {
            const title = (doc.title || "").toLowerCase();
            const description = (doc.description || "").toLowerCase();
            const keywords = Array.isArray(doc.keywords) 
              ? doc.keywords.join(" ").toLowerCase() 
              : "";
            const category = (doc.category || "").toLowerCase();
            
            return title.includes(searchTermLower) ||
                   description.includes(searchTermLower) ||
                   keywords.includes(searchTermLower) ||
                   category.includes(searchTermLower);
          });
          
          // Continue with filtered documents
          let documents = filteredDocs;
          
          // Apply category filter
          if (filters?.category && filters.category !== "Todas") {
            const categoryFilterNormalized = normalizeCategoryName(filters.category);
            documents = documents.filter((doc: any) => {
              const docCategoryNormalized = normalizeCategoryName(doc.category || "");
              return docCategoryNormalized === categoryFilterNormalized;
            });
          }
          
          // Generate signed URLs and stats
          const documentsWithSignedUrls = await Promise.all(
            documents.map(async (doc) => {
              const signedUrl = await getSignedUrl(doc.pdf_url);
              return { ...doc, pdf_url: signedUrl };
            })
          );

          const documentIds = documentsWithSignedUrls.map((doc) => doc.id);
          const stats = await fetchDocumentsStats(documentIds);

          const documentsWithStats = documentsWithSignedUrls.map((doc) => {
            const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
            return {
              ...doc,
              views: docStats.views,
              likes: docStats.likes,
              comments: docStats.comments,
            };
          });
          
          return documentsWithStats;
        }
        
        if (error.code === '42703' || error.message?.includes('parent_folder_id') || error.message?.includes('folder_path')) {
          // Column doesn't exist yet - return all documents
          const { data: allData, error: allError } = await supabase
            .from("documents")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false });
          
          if (allError) throw allError;
          return allData || [];
        }
        throw error;
      }
      
      // Generate signed URLs for all documents
      let documents = data || [];
      
      // If searchTerm was provided but textSearch might not have worked properly,
      // apply JavaScript filtering as additional check
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        const searchTermLower = filters.searchTerm.trim().toLowerCase();
        console.log(`[useDocuments] Applying JavaScript search filter for: "${filters.searchTerm}"`);
        console.log(`[useDocuments] Documents before JavaScript filter: ${documents.length}`);
        
        const filteredDocs = documents.filter((doc: any) => {
          const title = (doc.title || "").toLowerCase();
          const description = (doc.description || "").toLowerCase();
          const keywords = Array.isArray(doc.keywords) 
            ? doc.keywords.join(" ").toLowerCase() 
            : "";
          const category = (doc.category || "").toLowerCase();
          
          const matches = title.includes(searchTermLower) ||
                         description.includes(searchTermLower) ||
                         keywords.includes(searchTermLower) ||
                         category.includes(searchTermLower);
          
          if (!matches && documents.length <= 20) {
            console.log(`[useDocuments] Document "${doc.title}" does not match search term "${filters.searchTerm}"`);
          }
          
          return matches;
        });
        
        documents = filteredDocs;
        console.log(`[useDocuments] Documents after JavaScript filter: ${documents.length}`);
      }
      
      // Aplicar filtro de categoria com comparação case-insensitive e sem acentos
      if (filters?.category && filters.category !== "Todas") {
        const categoryFilterNormalized = normalizeCategoryName(filters.category);
        console.log('[useDocuments] Filtering by category:', filters.category, '-> normalized:', categoryFilterNormalized);
        console.log('[useDocuments] Total documents before filter:', documents.length);
        console.log('[useDocuments] Sample document categories:', documents.slice(0, 5).map(d => `${d.category} -> ${normalizeCategoryName(d.category)}`));
        
        documents = documents.filter((doc) => {
          const docCategoryNormalized = normalizeCategoryName(doc.category || "");
          const matches = docCategoryNormalized === categoryFilterNormalized;
          if (!matches && documents.length <= 10) {
            console.log(`[useDocuments] Document "${doc.title}" category "${doc.category}" (normalized: "${docCategoryNormalized}") does not match filter "${categoryFilterNormalized}"`);
          }
          return matches;
        });
        
        console.log('[useDocuments] Documents after filter:', documents.length);
      }
      const documentsWithSignedUrls = await Promise.all(
        documents.map(async (doc) => {
          const signedUrl = await getSignedUrl(doc.pdf_url);
          return { ...doc, pdf_url: signedUrl };
        })
      );

      // Fetch statistics for all documents
      const documentIds = documentsWithSignedUrls.map((doc) => doc.id);
      const stats = await fetchDocumentsStats(documentIds);

      // Add statistics to each document
      const documentsWithStats = documentsWithSignedUrls.map((doc) => {
        const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
        return {
          ...doc,
          views: docStats.views,
          likes: docStats.likes,
          comments: docStats.comments,
        };
      });
      
      return documentsWithStats;
    },
  });
}

// Fetch single document by ID
export function useDocumentById(id: string | null) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      
      // Fetch statistics for this document
      const stats = await fetchDocumentsStats([id]);
      const docStats = stats[id] || { views: 0, likes: 0, comments: 0 };
      
      // Add statistics to document
      return {
        ...data,
        views: docStats.views,
        likes: docStats.likes,
        comments: docStats.comments,
      };
    },
    enabled: !!id,
  });
}

// Create document
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentData: any) => {
      const { data, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar documento: " + error.message);
    },
  });
}

// Update document
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar documento: " + error.message);
    },
  });
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir documento: " + error.message);
    },
  });
}

// Track document view
export function useTrackDocumentView() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("document_views")
        .insert({ document_id: documentId });
      if (error) throw error;
    },
  });
}

// Fetch document likes
export function useDocumentLikes(documentId: string) {
  return useQuery({
    queryKey: ["document-likes", documentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_likes")
        .select("*", { count: "exact", head: true })
        .eq("document_id", documentId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!documentId,
  });
}

// Check if user liked document
export function useUserDocumentLike(documentId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-document-like", documentId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("document_likes")
        .select("*")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId && !!userId,
  });
}

// Toggle document like
export function useToggleDocumentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, userId }: { documentId: string; userId: string }) => {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("document_likes")
        .select("id")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from("document_likes")
          .delete()
          .eq("id", existingLike.id);
        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await supabase
          .from("document_likes")
          .insert({ document_id: documentId, user_id: userId });
        if (error) throw error;
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-likes"] });
      queryClient.invalidateQueries({ queryKey: ["user-document-like"] });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["root-contents"] });
      queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
    },
  });
}

// Fetch document comments
export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ["document-comments", documentId],
    queryFn: async () => {
      // 1. Buscar comentários
      const { data: comments, error } = await supabase
        .from("document_comments")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // 2. Buscar profiles dos usuários
      const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
      if (userIds.length === 0) return comments;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      // 3. Combinar dados
      return comments.map((comment: any) => ({
        ...comment,
        profiles: profiles?.find((p: any) => p.user_id === comment.user_id) || null,
      }));
    },
    enabled: !!documentId,
  });
}

// Create comment
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      userId,
      content,
    }: {
      documentId: string;
      userId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("document_comments")
        .insert({
          document_id: documentId,
          user_id: userId,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-comments"] });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Comentário adicionado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar comentário: " + error.message);
    },
  });
}
