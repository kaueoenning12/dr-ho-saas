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

// OTIMIZAÇÃO: Removida função getSignedUrl - signed URLs agora são gerados via lazy loading
// usando useSignedPdfUrl hook que tem cache integrado

export interface DocumentFilters {
  category?: string;
  searchTerm?: string;
  showOnlyNew?: boolean;
  folderId?: string | null;
  parentFolderId?: string | null;
  limit?: number;
  offset?: number;
}

export interface DocumentStats {
  views: number;
  likes: number;
  comments: number;
}

// Fetch statistics for multiple documents using aggregation
export async function fetchDocumentsStats(documentIds: string[]): Promise<Record<string, DocumentStats>> {
  if (documentIds.length === 0) return {};

  // Initialize stats object with zeros
  const stats: Record<string, DocumentStats> = {};
  documentIds.forEach((id) => {
    stats[id] = { views: 0, likes: 0, comments: 0 };
  });

// OTIMIZAÇÃO: Usar método com queries paralelas para estatísticas

  // MÉTODO OTIMIZADO: Fazer queries paralelas mas processar de forma mais eficiente
  // Processar em lotes se houver muitos documentos para evitar timeouts
  const BATCH_SIZE = 50; // Processar até 50 documentos por vez
  const needsBatching = documentIds.length > BATCH_SIZE;

  let viewsResult, likesResult, commentsResult;

  if (needsBatching) {
    // Processar em lotes para evitar timeouts com muitos documentos
    const batches: string[][] = [];
    for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
      batches.push(documentIds.slice(i, i + BATCH_SIZE));
    }

    // Processar todos os lotes em paralelo
    const batchPromises = batches.map(async (batch) => {
      const [batchViews, batchLikes, batchComments] = await Promise.allSettled([
        supabase.from("document_views").select("document_id").in("document_id", batch),
        supabase.from("document_likes").select("document_id").in("document_id", batch),
        supabase.from("document_comments").select("document_id").in("document_id", batch),
      ]);

      return { batchViews, batchLikes, batchComments };
    });

    const batchResults = await Promise.all(batchPromises);

    // Combinar resultados de todos os lotes
    const allViews: any[] = [];
    const allLikes: any[] = [];
    const allComments: any[] = [];

    batchResults.forEach(({ batchViews, batchLikes, batchComments }) => {
      if (batchViews.status === "fulfilled" && batchViews.value.data) {
        allViews.push(...batchViews.value.data);
      }
      if (batchLikes.status === "fulfilled" && batchLikes.value.data) {
        allLikes.push(...batchLikes.value.data);
      }
      if (batchComments.status === "fulfilled" && batchComments.value.data) {
        allComments.push(...batchComments.value.data);
      }
    });

    viewsResult = { status: "fulfilled" as const, value: { data: allViews } };
    likesResult = { status: "fulfilled" as const, value: { data: allLikes } };
    commentsResult = { status: "fulfilled" as const, value: { data: allComments } };
  } else {
    // Processar todos de uma vez se houver poucos documentos
    const results = await Promise.allSettled([
      supabase.from("document_views").select("document_id").in("document_id", documentIds),
      supabase.from("document_likes").select("document_id").in("document_id", documentIds),
      supabase.from("document_comments").select("document_id").in("document_id", documentIds),
    ]);

    viewsResult = results[0];
    likesResult = results[1];
    commentsResult = results[2];
  }

  // Process views - usar Map para contagem O(n) ao invés de O(n²)
  if (viewsResult.status === "fulfilled" && viewsResult.value.data) {
    const viewsMap = new Map<string, number>();
    // Contar ocorrências de cada document_id de forma eficiente
    viewsResult.value.data.forEach((view: any) => {
      if (view.document_id) {
        viewsMap.set(view.document_id, (viewsMap.get(view.document_id) || 0) + 1);
      }
    });
    // Aplicar contagens ao objeto stats
    viewsMap.forEach((count, docId) => {
      if (stats[docId]) {
        stats[docId].views = count;
      }
    });
  } else if (viewsResult.status === "rejected") {
    console.error("Error fetching views:", viewsResult.reason);
  }

  // Process likes - usar Map para contagem O(n) ao invés de O(n²)
  if (likesResult.status === "fulfilled" && likesResult.value.data) {
    const likesMap = new Map<string, number>();
    likesResult.value.data.forEach((like: any) => {
      if (like.document_id) {
        likesMap.set(like.document_id, (likesMap.get(like.document_id) || 0) + 1);
      }
    });
    likesMap.forEach((count, docId) => {
      if (stats[docId]) {
        stats[docId].likes = count;
      }
    });
  } else if (likesResult.status === "rejected") {
    console.error("Error fetching likes:", likesResult.reason);
  }

  // Process comments - usar Map para contagem O(n) ao invés de O(n²)
  if (commentsResult.status === "fulfilled" && commentsResult.value.data) {
    const commentsMap = new Map<string, number>();
    commentsResult.value.data.forEach((comment: any) => {
      if (comment.document_id) {
        commentsMap.set(comment.document_id, (commentsMap.get(comment.document_id) || 0) + 1);
      }
    });
    commentsMap.forEach((count, docId) => {
      if (stats[docId]) {
        stats[docId].comments = count;
      }
    });
  } else if (commentsResult.status === "rejected") {
    console.error("Error fetching comments:", commentsResult.reason);
  }

  return stats;
}

// Fetch all published documents
export function useDocuments(filters?: DocumentFilters, options?: { enabled?: boolean; staleTime?: number; includeStats?: boolean }) {
  return useQuery({
    queryKey: ["documents", filters],
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // Default 2 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      // Apply limit if provided
      if (filters?.limit !== undefined && filters.limit > 0) {
        if (filters.offset !== undefined && filters.offset > 0) {
          query = query.range(filters.offset, filters.offset + filters.limit - 1);
        } else {
          query = query.limit(filters.limit);
        }
      }

      // OTIMIZAÇÃO: Tentar filtrar categoria no banco quando possível
      // Se não funcionar, fallback para filtragem client-side
      let categoryFilterApplied = false;
      if (filters?.category && filters.category !== "Todas") {
        // Tentar usar filtro case-insensitive no banco
        // Nota: ilike pode não estar disponível em todos os clientes Supabase
        // Se não funcionar, aplicaremos filtro client-side depois
        try {
          query = query.ilike("category", filters.category);
          categoryFilterApplied = true;
        } catch (e) {
          // Se ilike não estiver disponível, filtrar client-side depois
          console.warn("[useDocuments] ilike não disponível, usando filtro client-side");
        }
      }

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
        // Se erro for sobre ilike, tentar sem filtro de categoria
        if (error.message?.includes('ilike') || error.message?.includes('ILIKE')) {
          console.warn("[useDocuments] Erro com ilike, tentando sem filtro de categoria:", error);
          // Retry sem filtro de categoria
          let retryQuery = supabase
            .from("documents")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false });
          
          // Apply limit if provided
          if (filters?.limit !== undefined && filters.limit > 0) {
            if (filters.offset !== undefined && filters.offset > 0) {
              retryQuery = retryQuery.range(filters.offset, filters.offset + filters.limit - 1);
            } else {
              retryQuery = retryQuery.limit(filters.limit);
            }
          }
          
          if (filters?.searchTerm) {
            retryQuery = retryQuery.textSearch("search_vector", filters.searchTerm);
          }
          
          if (filters?.showOnlyNew) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            retryQuery = retryQuery.gte("published_at", thirtyDaysAgo.toISOString());
          }
          
          if (!filters?.searchTerm) {
            if (filters?.folderId !== undefined && filters.folderId !== null) {
              retryQuery = retryQuery.eq("parent_folder_id", filters.folderId);
            } else if (filters?.parentFolderId !== undefined && filters.parentFolderId !== null) {
              retryQuery = retryQuery.eq("parent_folder_id", filters.parentFolderId);
            } else if (filters?.parentFolderId === null) {
              retryQuery = retryQuery.is("parent_folder_id", null);
            }
          }
          
          const { data: retryData, error: retryError } = await retryQuery;
          if (retryError) throw retryError;
          
          let documents = retryData || [];
          // Aplicar filtro de categoria client-side
          if (filters?.category && filters.category !== "Todas") {
            const categoryFilterNormalized = normalizeCategoryName(filters.category);
            documents = documents.filter((doc) => {
              const docCategoryNormalized = normalizeCategoryName(doc.category || "");
              return docCategoryNormalized === categoryFilterNormalized;
            });
          }
          
          // OTIMIZAÇÃO: Não gerar signed URLs aqui - lazy loading no DocumentCard/DocumentView
          // Fetch statistics for documents only if includeStats is not false
          if (options?.includeStats !== false) {
            const documentIds = documents.map((doc) => doc.id);
            const stats = await fetchDocumentsStats(documentIds);

            // Add statistics to each document (signed URLs serão gerados quando necessário)
            const documentsWithStats = documents.map((doc) => {
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
          
          // Return documents without stats if includeStats is false
          return documents.map((doc) => ({
            ...doc,
            views: 0,
            likes: 0,
            comments: 0,
          }));
        }
        
        // If error is about textSearch, try JavaScript fallback
        if (filters?.searchTerm && (error.message?.includes('textSearch') || error.message?.includes('search_vector'))) {
          console.warn("[useDocuments] textSearch failed, using JavaScript fallback:", error);
          // Fallback: fetch all documents and filter in JavaScript
          let fallbackQuery = supabase
            .from("documents")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false });
          
          // Apply limit if provided (but we'll filter in JS, so we might need more)
          // For search fallback, we fetch more than limit to ensure we have enough after filtering
          const fetchLimit = filters?.limit ? Math.max(filters.limit * 3, 100) : undefined;
          if (fetchLimit) {
            fallbackQuery = fallbackQuery.limit(fetchLimit);
          }
          
          const { data: allData, error: allError } = await fallbackQuery;
          
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
          
          // Apply limit if provided (after filtering)
          if (filters?.limit && filters.limit > 0) {
            const start = filters.offset || 0;
            documents = documents.slice(start, start + filters.limit);
          }
          
          // OTIMIZAÇÃO: Não gerar signed URLs aqui - lazy loading no DocumentCard/DocumentView
          // Fetch statistics for documents only if includeStats is not false
          if (options?.includeStats !== false) {
            const documentIds = documents.map((doc) => doc.id);
            const stats = await fetchDocumentsStats(documentIds);

            // Add statistics to each document (signed URLs serão gerados quando necessário)
            const documentsWithStats = documents.map((doc) => {
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
          
          // Return documents without stats if includeStats is false
          return documents.map((doc) => ({
            ...doc,
            views: 0,
            likes: 0,
            comments: 0,
          }));
        }
        
        if (error.code === '42703' || error.message?.includes('parent_folder_id') || error.message?.includes('folder_path')) {
          // Column doesn't exist yet - return all documents
          let fallbackQuery = supabase
            .from("documents")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false });
          
          // Apply limit if provided
          if (filters?.limit !== undefined && filters.limit > 0) {
            if (filters.offset !== undefined && filters.offset > 0) {
              fallbackQuery = fallbackQuery.range(filters.offset, filters.offset + filters.limit - 1);
            } else {
              fallbackQuery = fallbackQuery.limit(filters.limit);
            }
          }
          
          const { data: allData, error: allError } = await fallbackQuery;
          
          if (allError) throw allError;
          
          // Return documents without stats if includeStats is false
          if (options?.includeStats === false) {
            return (allData || []).map((doc) => ({
              ...doc,
              views: 0,
              likes: 0,
              comments: 0,
            }));
          }
          
          return allData || [];
        }
        throw error;
      }
      
      // OTIMIZAÇÃO: Não gerar signed URLs - lazy loading no DocumentCard/DocumentView
      let documents = data || [];
      
      // Apply category filter client-side if not applied in database query
      if (filters?.category && filters.category !== "Todas" && !categoryFilterApplied) {
        const categoryFilterNormalized = normalizeCategoryName(filters.category);
        documents = documents.filter((doc) => {
          const docCategoryNormalized = normalizeCategoryName(doc.category || "");
          return docCategoryNormalized === categoryFilterNormalized;
        });
      }
      
      // If searchTerm was provided but textSearch might not have worked properly,
      // apply JavaScript filtering as additional check (only if needed)
      if (filters?.searchTerm && filters.searchTerm.trim() && documents.length > 0) {
        const searchTermLower = filters.searchTerm.trim().toLowerCase();
        const searchTerms = searchTermLower.split(/\s+/).filter(t => t.length > 0);
        
        // Only apply JavaScript filter if we have search terms
        if (searchTerms.length > 0) {
          documents = documents.filter((doc: any) => {
            const title = (doc.title || "").toLowerCase();
            const description = (doc.description || "").toLowerCase();
            const keywords = Array.isArray(doc.keywords) 
              ? doc.keywords.join(" ").toLowerCase() 
              : "";
            const category = (doc.category || "").toLowerCase();
            const searchText = `${title} ${description} ${keywords} ${category}`;
            
            // All search terms must be found
            return searchTerms.every(term => searchText.includes(term));
          });
        }
      }

      // OTIMIZAÇÃO: Retornar documentos imediatamente sem esperar estatísticas
      // Estatísticas serão carregadas em background via useDocumentStats hook
      // Isso acelera drasticamente o carregamento inicial
      // OTIMIZAÇÃO: Não gerar signed URLs aqui - lazy loading no DocumentCard/DocumentView
      // Isso reduz drasticamente o tempo de carregamento inicial
      // Fetch statistics for documents only if includeStats is not false
      if (options?.includeStats !== false) {
        const documentIds = documents.map((doc) => doc.id);
        const stats = await fetchDocumentsStats(documentIds);

        // Add statistics to each document (signed URLs serão gerados quando necessário via useSignedPdfUrl)
        const documentsWithStats = documents.map((doc) => {
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
      
      // Return documents without stats if includeStats is false
      return documents.map((doc) => ({
        ...doc,
        views: 0,
        likes: 0,
        comments: 0,
      }));
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
      toast.success("Relatório criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar relatório: " + error.message);
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
      toast.success("Relatório atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar relatório: " + error.message);
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
      toast.success("Relatório excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir relatório: " + error.message);
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
    staleTime: 2 * 60 * 1000, // 2 minutes - user likes don't change often
  });
}

// Batch fetch user likes for multiple documents
export function useUserDocumentLikesBatch(documentIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ["user-document-likes-batch", documentIds.sort().join(","), userId],
    queryFn: async () => {
      if (!userId || documentIds.length === 0) return new Set<string>();
      
      const { data, error } = await supabase
        .from("document_likes")
        .select("document_id")
        .in("document_id", documentIds)
        .eq("user_id", userId);
      
      if (error) throw error;
      
      // Return a Set of document IDs that the user has liked
      return new Set((data || []).map((like: any) => like.document_id));
    },
    enabled: !!userId && documentIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
      queryClient.invalidateQueries({ queryKey: ["user-document-likes-batch"] });
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

// Hook otimizado para buscar documentos recentes (limitado)
// Usa limit no banco para reduzir drasticamente a quantidade de dados transferidos
export function useRecentDocuments(limit: number = 6) {
  return useDocuments(
    { limit },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - documentos recentes mudam menos frequentemente
      includeStats: false, // Não buscar estatísticas para acelerar carregamento inicial
    }
  );
}
