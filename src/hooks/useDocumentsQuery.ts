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
  showOnlyFavorites?: boolean;
  folderId?: string | null;
  parentFolderId?: string | null;
  limit?: number;
  offset?: number;
  userId?: string; // Required when filtering by favorites
}

export interface DocumentStats {
  views: number;
  likes: number;
  comments: number;
}

// Flag global para cachear se a função RPC existe (evita tentativas repetidas)
// Armazenado em sessionStorage para persistir entre recarregamentos da página
const RPC_CHECK_KEY = '__rpc_get_document_stats_exists';

function getRpcFunctionStatus(): 'unknown' | 'exists' | 'not_exists' {
  if (typeof window === 'undefined') return 'unknown';
  const status = sessionStorage.getItem(RPC_CHECK_KEY);
  if (status === 'true') return 'exists';
  if (status === 'false') return 'not_exists';
  return 'unknown';
}

function setRpcFunctionStatus(exists: boolean): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RPC_CHECK_KEY, exists ? 'true' : 'false');
}

// Fetch statistics for multiple documents using aggregation
export async function fetchDocumentsStats(documentIds: string[]): Promise<Record<string, DocumentStats>> {
  if (documentIds.length === 0) return {};

  // Initialize stats object with zeros
  const stats: Record<string, DocumentStats> = {};
  documentIds.forEach((id) => {
    stats[id] = { views: 0, likes: 0, comments: 0 };
  });

  // OTIMIZAÇÃO: Tentar usar função RPC primeiro (muito mais eficiente)
  // Se não estiver disponível, usar fallback com queries diretas
  // IMPORTANTE: Não tentar se já sabemos que não existe (evita erros 400 no console)
  const rpcStatus = getRpcFunctionStatus();
  
  // Só tentar usar RPC se não sabemos que ela não existe
  if (rpcStatus !== 'not_exists') {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_document_stats", {
        document_ids: documentIds,
      });

      // Verificar se a função existe e retornou dados válidos
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        // Função RPC disponível e funcionando - usar dados dela
        rpcData.forEach((row: { document_id: string; views: number; likes: number; comments: number }) => {
          if (stats[row.document_id]) {
            stats[row.document_id] = {
              views: Number(row.views) || 0,
              likes: Number(row.likes) || 0,
              comments: Number(row.comments) || 0,
            };
          }
        });
        // Marcar que a função existe para próximas chamadas
        setRpcFunctionStatus(true);
        return stats;
      }
      
      // Se erro 400 ou função não existe, marcar como não disponível
      if (rpcError) {
        // Verificar se é erro 400 (função não existe) ou outro erro
        const isFunctionNotFound = rpcError.code === '42883' || 
                                   rpcError.message?.includes('function') ||
                                   rpcError.message?.includes('does not exist');
        
        if (isFunctionNotFound) {
          // Marcar que a função não existe para evitar tentativas futuras
          setRpcFunctionStatus(false);
        }
        // Não logar erro - isso é esperado se a função não existe
      }
    } catch (rpcError: any) {
      // Função RPC não disponível - marcar como não existente
      setRpcFunctionStatus(false);
      // Não logar erro para não poluir o console
    }
  }

  // FALLBACK: Processar em lotes menores para evitar timeout
  // O problema é que buscar todos os registros de document_views pode ser muito lento
  // Vamos usar lotes menores e processar sequencialmente
  const BATCH_SIZE = 10; // Reduzido para 10 para evitar timeout
  const needsBatching = documentIds.length > BATCH_SIZE;

  let viewsResult, likesResult, commentsResult;

  // Função auxiliar para contar ocorrências
  const countByDocumentId = (items: any[]): Array<{ document_id: string; count: number }> => {
    const counts: Record<string, number> = {};
    items.forEach((item: any) => {
      if (item.document_id) {
        counts[item.document_id] = (counts[item.document_id] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([document_id, count]) => ({ document_id, count }));
  };

  if (needsBatching) {
    // Processar em lotes sequencialmente para evitar sobrecarga
    const batches: string[][] = [];
    for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
      batches.push(documentIds.slice(i, i + BATCH_SIZE));
    }

    const allViews: Array<{ document_id: string; count: number }> = [];
    const allLikes: Array<{ document_id: string; count: number }> = [];
    const allComments: Array<{ document_id: string; count: number }> = [];

    // Processar lotes sequencialmente (não em paralelo) para evitar timeout
    for (const batch of batches) {
      try {
        // Processar views, likes e comments em paralelo dentro de cada batch
        const [batchViews, batchLikes, batchComments] = await Promise.allSettled([
          supabase.from("document_views").select("document_id").in("document_id", batch),
          supabase.from("document_likes").select("document_id").in("document_id", batch),
          supabase.from("document_comments").select("document_id").in("document_id", batch),
        ]);

        if (batchViews.status === "fulfilled" && batchViews.value.data && !batchViews.value.error) {
          allViews.push(...countByDocumentId(batchViews.value.data));
        } else if (batchViews.status === "rejected" || batchViews.value?.error) {
          // Log removido para não expor erros sensíveis
        }

        if (batchLikes.status === "fulfilled" && batchLikes.value.data && !batchLikes.value.error) {
          allLikes.push(...countByDocumentId(batchLikes.value.data));
        } else if (batchLikes.status === "rejected" || batchLikes.value?.error) {
          // Log removido para não expor erros sensíveis
        }

        if (batchComments.status === "fulfilled" && batchComments.value.data && !batchComments.value.error) {
          allComments.push(...countByDocumentId(batchComments.value.data));
        } else if (batchComments.status === "rejected" || batchComments.value?.error) {
          // Log removido para não expor erros sensíveis
        }

        // Pequeno delay entre batches para evitar sobrecarga
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        // Log removido para não expor erros sensíveis
        // Continuar processando outros lotes mesmo se um falhar
      }
    }

    // Agregar contagens finais (pode haver duplicatas se um documento aparecer em múltiplos batches)
    const viewsMap = new Map<string, number>();
    allViews.forEach(item => {
      viewsMap.set(item.document_id, (viewsMap.get(item.document_id) || 0) + item.count);
    });
    viewsResult = { status: "fulfilled" as const, value: { data: Array.from(viewsMap.entries()).map(([document_id, count]) => ({ document_id, count })) } };

    const likesMap = new Map<string, number>();
    allLikes.forEach(item => {
      likesMap.set(item.document_id, (likesMap.get(item.document_id) || 0) + item.count);
    });
    likesResult = { status: "fulfilled" as const, value: { data: Array.from(likesMap.entries()).map(([document_id, count]) => ({ document_id, count })) } };

    const commentsMap = new Map<string, number>();
    allComments.forEach(item => {
      commentsMap.set(item.document_id, (commentsMap.get(item.document_id) || 0) + item.count);
    });
    commentsResult = { status: "fulfilled" as const, value: { data: Array.from(commentsMap.entries()).map(([document_id, count]) => ({ document_id, count })) } };
  } else {
    // Processar todos de uma vez se houver poucos documentos
    try {
      const [viewsData, likesData, commentsData] = await Promise.allSettled([
        supabase.from("document_views").select("document_id").in("document_id", documentIds),
        supabase.from("document_likes").select("document_id").in("document_id", documentIds),
        supabase.from("document_comments").select("document_id").in("document_id", documentIds),
      ]);

      // Processar views
      if (viewsData.status === "fulfilled" && viewsData.value.data && !viewsData.value.error) {
        viewsResult = { 
          status: "fulfilled" as const, 
          value: { data: countByDocumentId(viewsData.value.data) } 
        };
      } else {
        viewsResult = { status: "rejected" as const, reason: viewsData.status === "rejected" ? viewsData.reason : viewsData.value?.error };
        // Log removido para não expor erros sensíveis
      }

      // Processar likes
      if (likesData.status === "fulfilled" && likesData.value.data && !likesData.value.error) {
        likesResult = { 
          status: "fulfilled" as const, 
          value: { data: countByDocumentId(likesData.value.data) } 
        };
      } else {
        likesResult = { status: "rejected" as const, reason: likesData.status === "rejected" ? likesData.reason : likesData.value?.error };
        // Log removido para não expor erros sensíveis
      }

      // Processar comments
      if (commentsData.status === "fulfilled" && commentsData.value.data && !commentsData.value.error) {
        commentsResult = { 
          status: "fulfilled" as const, 
          value: { data: countByDocumentId(commentsData.value.data) } 
        };
      } else {
        commentsResult = { status: "rejected" as const, reason: commentsData.status === "rejected" ? commentsData.reason : commentsData.value?.error };
        // Log removido para não expor erros sensíveis
      }
    } catch (error) {
      // Log removido para não expor erros sensíveis
      // Retornar stats com zeros se houver erro
      return stats;
    }
  }

  // Process views - agora os dados já vêm com count
  if (viewsResult.status === "fulfilled" && viewsResult.value.data) {
    viewsResult.value.data.forEach((item: { document_id: string; count: number }) => {
      if (stats[item.document_id]) {
        stats[item.document_id].views = item.count;
      }
    });
  } else if (viewsResult.status === "rejected") {
    // Log removido para não expor erros sensíveis
  }

  // Process likes - agora os dados já vêm com count
  if (likesResult.status === "fulfilled" && likesResult.value.data) {
    likesResult.value.data.forEach((item: { document_id: string; count: number }) => {
      if (stats[item.document_id]) {
        stats[item.document_id].likes = item.count;
      }
    });
  } else if (likesResult.status === "rejected") {
    // Log removido para não expor erros sensíveis
  }

  // Process comments - agora os dados já vêm com count
  if (commentsResult.status === "fulfilled" && commentsResult.value.data) {
    commentsResult.value.data.forEach((item: { document_id: string; count: number }) => {
      if (stats[item.document_id]) {
        stats[item.document_id].comments = item.count;
      }
    });
  } else if (commentsResult.status === "rejected") {
    // Log removido para não expor erros sensíveis
    // Não lançar erro, apenas continuar com contagens zero
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
      
      // Filter by favorites if requested
      let filteredData = data;
      if (filters?.showOnlyFavorites && filters?.userId && !error && filteredData) {
        // Get user's favorite document IDs
        const { data: favorites, error: favoritesError } = await supabase
          .from("document_favorites")
          .select("document_id")
          .eq("user_id", filters.userId);
        
        if (!favoritesError && favorites) {
          const favoriteIds = new Set(favorites.map(f => f.document_id));
          filteredData = filteredData.filter(doc => favoriteIds.has(doc.id));
        }
      }
      
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
          
          // Filter by favorites if requested
          if (filters?.showOnlyFavorites && filters?.userId && documents.length > 0) {
            const { data: favorites, error: favoritesError } = await supabase
              .from("document_favorites")
              .select("document_id")
              .eq("user_id", filters.userId);
            
            if (!favoritesError && favorites) {
              const favoriteIds = new Set(favorites.map(f => f.document_id));
              documents = documents.filter((doc: any) => favoriteIds.has(doc.id));
            }
          }
          
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
          
          // Normalize search term to remove accents (e.g., "plastico" matches "plástico")
          const searchTermNormalized = filters.searchTerm
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          
          const filteredDocs = (allData || []).filter((doc: any) => {
            const normalizeText = (text: string) => {
              if (!text) return "";
              return text
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            };
            
            const title = normalizeText(doc.title || "");
            const description = normalizeText(doc.description || "");
            const keywords = Array.isArray(doc.keywords) 
              ? normalizeText(doc.keywords.join(" ")) 
              : "";
            const category = normalizeText(doc.category || "");
            
            return title.includes(searchTermNormalized) ||
                   description.includes(searchTermNormalized) ||
                   keywords.includes(searchTermNormalized) ||
                   category.includes(searchTermNormalized);
          });
          
          // Continue with filtered documents
          let documents = filteredDocs;
          
          // Filter by favorites if requested
          if (filters?.showOnlyFavorites && filters?.userId && documents.length > 0) {
            const { data: favorites, error: favoritesError } = await supabase
              .from("document_favorites")
              .select("document_id")
              .eq("user_id", filters.userId);
            
            if (!favoritesError && favorites) {
              const favoriteIds = new Set(favorites.map(f => f.document_id));
              documents = documents.filter((doc: any) => favoriteIds.has(doc.id));
            }
          }
          
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
      
      // Filter by favorites if requested
      if (filters?.showOnlyFavorites && filters?.userId && documents.length > 0) {
        // Get user's favorite document IDs
        const { data: favorites, error: favoritesError } = await supabase
          .from("document_favorites")
          .select("document_id")
          .eq("user_id", filters.userId);
        
        if (!favoritesError && favorites) {
          const favoriteIds = new Set(favorites.map(f => f.document_id));
          documents = documents.filter((doc: any) => favoriteIds.has(doc.id));
        }
      }
      
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
        // Normalize search term to remove accents (e.g., "plastico" matches "plástico")
        const normalizeText = (text: string) => {
          if (!text) return "";
          return text
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        };
        
        const searchTermNormalized = normalizeText(filters.searchTerm);
        const searchTerms = searchTermNormalized.split(/\s+/).filter(t => t.length > 0);
        
        // Only apply JavaScript filter if we have search terms
        if (searchTerms.length > 0) {
          documents = documents.filter((doc: any) => {
            const title = normalizeText(doc.title || "");
            const description = normalizeText(doc.description || "");
            const keywords = Array.isArray(doc.keywords) 
              ? normalizeText(doc.keywords.join(" ")) 
              : "";
            const category = normalizeText(doc.category || "");
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

// Mapa global para rastrear visualizações em andamento (evita condições de corrida)
const trackingInProgress = new Set<string>();

// Track document view
export function useTrackDocumentView() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ documentId, userId }: { documentId: string; userId?: string | null }) => {
      // Verificar se já está sendo processado (evita múltiplas chamadas simultâneas)
      if (trackingInProgress.has(documentId)) {
        // Log removido para não expor IDs sensíveis
        return null; // Já está sendo processado
      }

      // Marcar como em processamento
      trackingInProgress.add(documentId);

      try {
        // Obter informações do navegador
        const userAgent = navigator.userAgent || null;
        
        // Preparar dados para inserção
        const viewData: {
          document_id: string;
          user_id?: string | null;
          user_agent?: string | null;
        } = {
          document_id: documentId,
          user_id: userId || null,
          user_agent: userAgent,
        };

        const { data, error } = await supabase
          .from("document_views")
          .insert(viewData)
          .select()
          .single();

        if (error) {
          // Log removido para não expor IDs e erros sensíveis
          throw error;
        }

        // Log apenas em desenvolvimento (sem expor IDs sensíveis)
        if (import.meta.env.DEV) {
          console.log(`[VIEWS] ✅ Visualização registrada`);
        }

        return data;
      } finally {
        // Sempre remover do Set de processamento, mesmo em caso de erro
        trackingInProgress.delete(documentId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to update view counts
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["root-contents"] });
        queryClient.invalidateQueries({ queryKey: ["folder-contents"] });
        queryClient.invalidateQueries({ queryKey: ["recursive-documents"] });
      }
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
      queryClient.invalidateQueries({ queryKey: ["recursive-documents"] });
    },
  });
}

// Fetch document comments
export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ["document-comments", documentId],
    queryFn: async () => {
      // 1. Buscar comentários (incluindo updated_at)
      const { data: comments, error } = await supabase
        .from("document_comments")
        .select("id, content, created_at, updated_at, document_id, user_id")
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

// Update comment
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      documentId,
    }: {
      commentId: string;
      content: string;
      documentId: string;
    }) => {
      const { data, error } = await supabase
        .from("document_comments")
        .update({ content })
        .eq("id", commentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-comments"] });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Comentário atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar comentário: " + error.message);
    },
  });
}

// Delete comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      documentId,
    }: {
      commentId: string;
      documentId: string;
    }) => {
      const { error } = await supabase
        .from("document_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-comments"] });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Comentário excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir comentário: " + error.message);
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
