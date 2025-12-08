import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchDocumentsStats, type DocumentStats } from "./useDocumentsQuery";

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

type Folder = Database["public"]["Tables"]["document_folders"]["Row"];

/**
 * Search all documents and folders by search term
 */
async function searchAllContents(searchTerm: string, categoryFilter?: string): Promise<FolderContents> {
  console.log(`[Search] Searching for: "${searchTerm}"`);
  
  // 1. Search documents using textSearch on search_vector (with JavaScript fallback)
  let allDocuments: any[] = [];
  const searchTermLower = searchTerm.toLowerCase();
  
  try {
    // Try textSearch first
    let documentsQuery = supabase
      .from("documents")
      .select("*")
      .eq("is_published", true)
      .textSearch("search_vector", searchTerm);

    const { data: documentsData, error: documentsError } = await documentsQuery;

    if (documentsError) {
      console.warn("[Search] textSearch failed, using JavaScript fallback:", documentsError);
      // Fallback: fetch all documents and filter in JavaScript
      const { data: allDocsData, error: allDocsError } = await supabase
        .from("documents")
        .select("*")
        .eq("is_published", true);
      
      if (allDocsError) {
        console.error("[Search] Error fetching all documents:", allDocsError);
        allDocuments = [];
      } else {
        // Filter in JavaScript: search in title, description, keywords, category, and file URL
        allDocuments = (allDocsData || []).filter((doc: any) => {
          const title = (doc.title || "").toLowerCase();
          const description = (doc.description || "").toLowerCase();
          const keywords = Array.isArray(doc.keywords) 
            ? doc.keywords.join(" ").toLowerCase() 
            : "";
          const category = (doc.category || "").toLowerCase();
          const pdfUrl = (doc.pdf_url || "").toLowerCase();
          
          return title.includes(searchTermLower) ||
                 description.includes(searchTermLower) ||
                 keywords.includes(searchTermLower) ||
                 category.includes(searchTermLower) ||
                 pdfUrl.includes(searchTermLower);
        });
        console.log(`[Search] JavaScript fallback found ${allDocuments.length} documents matching "${searchTerm}"`);
        if (allDocuments.length > 0) {
          console.log(`[Search] Sample documents found:`, allDocuments.slice(0, 3).map((d: any) => ({ id: d.id, title: d.title, pdf_url: d.pdf_url })));
        }
      }
    } else {
      // textSearch returned results - use them directly
      const textSearchResults = documentsData || [];
      console.log(`[Search] textSearch found ${textSearchResults.length} documents matching "${searchTerm}"`);
      
      // Also do a JavaScript search to find documents that textSearch might have missed
      // Then combine both results (union) to ensure all matching documents are included
      const { data: allDocsData, error: allDocsError } = await supabase
        .from("documents")
        .select("*")
        .eq("is_published", true);
      
      if (!allDocsError && allDocsData) {
        // Filter in JavaScript to find additional matches
        const jsSearchResults = (allDocsData || []).filter((doc: any) => {
          const title = (doc.title || "").toLowerCase();
          const description = (doc.description || "").toLowerCase();
          const keywords = Array.isArray(doc.keywords) 
            ? doc.keywords.join(" ").toLowerCase() 
            : "";
          const category = (doc.category || "").toLowerCase();
          const pdfUrl = (doc.pdf_url || "").toLowerCase();
          
          return title.includes(searchTermLower) ||
                 description.includes(searchTermLower) ||
                 keywords.includes(searchTermLower) ||
                 category.includes(searchTermLower) ||
                 pdfUrl.includes(searchTermLower);
        });
        
        console.log(`[Search] JavaScript search found ${jsSearchResults.length} documents matching "${searchTerm}"`);
        
        // Combine results (union) - use a Map to avoid duplicates by document ID
        const documentsMap = new Map();
        
        // Add textSearch results
        textSearchResults.forEach((doc: any) => {
          documentsMap.set(doc.id, doc);
        });
        
        // Add JavaScript search results (will overwrite duplicates, keeping the first one)
        jsSearchResults.forEach((doc: any) => {
          if (!documentsMap.has(doc.id)) {
            documentsMap.set(doc.id, doc);
          }
        });
        
        allDocuments = Array.from(documentsMap.values());
        console.log(`[Search] Combined results: ${allDocuments.length} unique documents matching "${searchTerm}"`);
        if (allDocuments.length > 0) {
          console.log(`[Search] Sample combined documents:`, allDocuments.slice(0, 3).map((d: any) => ({ id: d.id, title: d.title, pdf_url: d.pdf_url })));
        }
      } else {
        // If JavaScript search fails, use textSearch results
        allDocuments = textSearchResults;
        console.log(`[Search] Using only textSearch results: ${allDocuments.length} documents`);
        if (allDocuments.length > 0) {
          console.log(`[Search] Sample textSearch documents:`, allDocuments.slice(0, 3).map((d: any) => ({ id: d.id, title: d.title, pdf_url: d.pdf_url })));
        }
      }
    }
  } catch (error) {
    console.error("[Search] Error in document search, using JavaScript fallback:", error);
    // Fallback: fetch all documents and filter in JavaScript
    try {
      const { data: allDocsData, error: allDocsError } = await supabase
        .from("documents")
        .select("*")
        .eq("is_published", true);
      
      if (allDocsError) {
        console.error("[Search] Error fetching all documents:", allDocsError);
        allDocuments = [];
      } else {
        // Filter in JavaScript: search in title, description, keywords, category, and file URL
        allDocuments = (allDocsData || []).filter((doc: any) => {
          const title = (doc.title || "").toLowerCase();
          const description = (doc.description || "").toLowerCase();
          const keywords = Array.isArray(doc.keywords) 
            ? doc.keywords.join(" ").toLowerCase() 
            : "";
          const category = (doc.category || "").toLowerCase();
          const pdfUrl = (doc.pdf_url || "").toLowerCase();
          
          return title.includes(searchTermLower) ||
                 description.includes(searchTermLower) ||
                 keywords.includes(searchTermLower) ||
                 category.includes(searchTermLower) ||
                 pdfUrl.includes(searchTermLower);
        });
        console.log(`[Search] JavaScript fallback found ${allDocuments.length} documents matching "${searchTerm}"`);
        if (allDocuments.length > 0) {
          console.log(`[Search] Sample documents found:`, allDocuments.slice(0, 3).map((d: any) => ({ id: d.id, title: d.title, pdf_url: d.pdf_url })));
        }
      }
    } catch (fallbackError) {
      console.error("[Search] Error in JavaScript fallback:", fallbackError);
      allDocuments = [];
    }
  }

  // 2. Apply category filter if provided
  if (categoryFilter && categoryFilter !== "Todas") {
    const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
    allDocuments = allDocuments.filter((doc: any) => {
      const docCategoryNormalized = normalizeCategoryName(doc.category || "");
      return docCategoryNormalized === categoryFilterNormalized;
    });
    console.log(`[Search] After category filter: ${allDocuments.length} documents`);
  }

  // 3. Search folders by name (case-insensitive)
  let matchingFolders: Folder[] = [];
  try {
    const { data: allFolders, error: foldersError } = await supabase
      .from("document_folders")
      .select("*")
      .order("name", { ascending: true });

    if (foldersError) {
      console.error("[Search] Error fetching folders:", foldersError);
    } else {
      const searchTermLower = searchTerm.toLowerCase();
      matchingFolders = (allFolders || []).filter((folder: Folder) => {
        return folder.name.toLowerCase().includes(searchTermLower);
      }) as Folder[];
      console.log(`[Search] Found ${matchingFolders.length} folders matching "${searchTerm}"`);
    }
  } catch (error) {
    console.error("[Search] Error in folder search:", error);
  }

  // 4. If category filter is active, filter folders that contain matching documents
  if (categoryFilter && categoryFilter !== "Todas" && matchingFolders.length > 0) {
    const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
    const folderIds = matchingFolders.map((f) => f.id);
    
    // Get all subfolder IDs for matching folders
    const allSubfolderIds = await getAllSubfolderIds(folderIds);
    
    // Check which folders have documents matching the category
    const { data: folderDocuments } = await supabase
      .from("documents")
      .select("parent_folder_id, category")
      .in("parent_folder_id", allSubfolderIds)
      .eq("is_published", true);

    const foldersWithMatchingDocs = new Set(
      (folderDocuments || [])
        .filter((doc: any) => {
          const docCategoryNormalized = normalizeCategoryName(doc.category || "");
          return docCategoryNormalized === categoryFilterNormalized;
        })
        .map((doc: any) => doc.parent_folder_id)
    );

    matchingFolders = matchingFolders.filter((folder) => {
      // Check if folder or any of its subfolders have matching documents
      return Array.from(foldersWithMatchingDocs).some(docFolderId => {
        return docFolderId === folder.id || allSubfolderIds.includes(docFolderId);
      });
    });
  }

  // 5. Fetch statistics for documents
  const documentIds = allDocuments.map((doc: any) => doc.id);
  console.log(`[Search] Fetching stats for ${documentIds.length} documents`);
  const stats = await fetchDocumentsStats(documentIds);

  // 6. Add statistics to each document
  const documentsWithStats = allDocuments.map((doc: any) => {
    const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
    return {
      ...doc,
      views: docStats.views,
      likes: docStats.likes,
      comments: docStats.comments,
    };
  });

  console.log(`[Search] Final results: ${matchingFolders.length} folders, ${documentsWithStats.length} documents`);

  return {
    folders: matchingFolders,
    documents: documentsWithStats,
  };
}

/**
 * Get all subfolder IDs recursively (including the original folder IDs)
 * This function searches for all subfolders at any depth within the given folders
 */
async function getAllSubfolderIds(folderIds: string[]): Promise<string[]> {
  if (folderIds.length === 0) return [];
  
  const allFolderIds = new Set<string>(folderIds);
  let currentLevelIds = [...folderIds];
  
  // Keep searching for subfolders until no more are found
  while (currentLevelIds.length > 0) {
    const { data: subfolders, error } = await supabase
      .from("document_folders")
      .select("id")
      .in("parent_folder_id", currentLevelIds);
    
    if (error) {
      console.warn("[getAllSubfolderIds] Error fetching subfolders:", error);
      break;
    }
    
    if (!subfolders || subfolders.length === 0) {
      break; // No more subfolders found
    }
    
    const newSubfolderIds = subfolders
      .map((f) => f.id)
      .filter((id) => !allFolderIds.has(id)); // Avoid duplicates
    
    if (newSubfolderIds.length === 0) {
      break; // No new subfolders found
    }
    
    // Add new subfolder IDs to the set
    newSubfolderIds.forEach((id) => allFolderIds.add(id));
    
    // Continue searching from the new subfolders
    currentLevelIds = newSubfolderIds;
  }
  
  return Array.from(allFolderIds);
}

export interface FolderContents {
  folders: Folder[];
  documents: Database["public"]["Tables"]["documents"]["Row"][];
}

/**
 * Fetch folders (root folders or children of a specific folder)
 */
export function useFolders(parentFolderId: string | null = null) {
  return useQuery({
    queryKey: ["folders", parentFolderId],
    queryFn: async () => {
      let query = supabase
        .from("document_folders")
        .select("*")
        .order("name", { ascending: true });

      if (parentFolderId === null) {
        // Get root folders (no parent)
        query = query.is("parent_folder_id", null);
      } else {
        // Get children of specific folder
        query = query.eq("parent_folder_id", parentFolderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Folder[];
    },
  });
}

/**
 * Fetch contents of a folder (both subfolders and documents)
 */
export function useFolderContents(folderId: string | null, categoryFilter?: string, searchTerm?: string) {
  return useQuery({
    queryKey: ["folder-contents", folderId, categoryFilter, searchTerm],
    staleTime: 2 * 60 * 1000, // 2 minutes - don't refetch too often
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    queryFn: async (): Promise<FolderContents> => {
      // If searching, use searchAllContents (same as root)
      if (searchTerm && searchTerm.trim()) {
        return await searchAllContents(searchTerm.trim(), categoryFilter);
      }
      // Get subfolders
      const { data: folders, error: foldersError } = await supabase
        .from("document_folders")
        .select("*")
        .eq("parent_folder_id", folderId)
        .order("name", { ascending: true });

      if (foldersError) throw foldersError;

      // Get documents in this folder
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("parent_folder_id", folderId)
        .eq("is_published", true)
        .order("title", { ascending: true });

      if (documentsError) throw documentsError;

      // Apply category filter with case-insensitive comparison and accent removal
      let filteredDocuments = documents || [];
      if (categoryFilter && categoryFilter !== "Todas") {
        const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
        console.log('[useFolderContents] Filtering by category:', categoryFilter, '-> normalized:', categoryFilterNormalized);
        console.log('[useFolderContents] Total documents before filter:', filteredDocuments.length);
        console.log('[useFolderContents] Sample document categories:', filteredDocuments.slice(0, 5).map(d => `${d.category} -> ${normalizeCategoryName(d.category)}`));
        
        filteredDocuments = filteredDocuments.filter((doc) => {
          const docCategoryNormalized = normalizeCategoryName(doc.category || "");
          const matches = docCategoryNormalized === categoryFilterNormalized;
          if (!matches && filteredDocuments.length <= 10) {
            console.log(`[useFolderContents] Document "${doc.title}" category "${doc.category}" (normalized: "${docCategoryNormalized}") does not match filter "${categoryFilterNormalized}"`);
          }
          return matches;
        });
        
        console.log('[useFolderContents] Documents after filter:', filteredDocuments.length);
      }

      // Fetch statistics for documents
      const documentIds = filteredDocuments.map((doc) => doc.id);
      const stats = await fetchDocumentsStats(documentIds);

      // Add statistics to each document
      const documentsWithStats = filteredDocuments.map((doc) => {
        const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
        return {
          ...doc,
          views: docStats.views,
          likes: docStats.likes,
          comments: docStats.comments,
        };
      });

      // Filter folders: only show folders that contain documents matching the category filter
      let filteredFolders = (folders || []) as Folder[];
      if (categoryFilter && categoryFilter !== "Todas" && filteredFolders.length > 0) {
        try {
          const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
          
          // Optimized: Get all subfolder IDs for all folders at once
          const allFolderIds = filteredFolders.map((f) => f.id);
          const allSubfolderIdsMap = new Map<string, string[]>();
          
          // Get all subfolder IDs for all folders in parallel
          await Promise.all(
            allFolderIds.map(async (folderId) => {
              const subfolderIds = await getAllSubfolderIds([folderId]);
              allSubfolderIdsMap.set(folderId, subfolderIds);
            })
          );
          
          // Get all unique subfolder IDs
          const allSubfolderIds = Array.from(new Set(
            Array.from(allSubfolderIdsMap.values()).flat()
          ));
          
          // Single query to get all documents in all folders
          const { data: allFolderDocuments, error: folderDocsError } = await supabase
            .from("documents")
            .select("parent_folder_id, category")
            .in("parent_folder_id", allSubfolderIds)
            .eq("is_published", true);
          
          if (folderDocsError) {
            console.error("[Folder Contents] Error fetching documents for folders:", folderDocsError);
            filteredFolders = [];
          } else if (allFolderDocuments && allFolderDocuments.length > 0) {
            // Create a set of folder IDs that have matching documents
            const foldersWithMatchingDocs = new Set<string>();
            
            allFolderDocuments.forEach((doc) => {
              const docCategoryNormalized = normalizeCategoryName(doc.category || "");
              if (docCategoryNormalized === categoryFilterNormalized && doc.parent_folder_id) {
                // Find which top-level folder this document belongs to
                for (const [topFolderId, subfolderIds] of allSubfolderIdsMap.entries()) {
                  if (subfolderIds.includes(doc.parent_folder_id)) {
                    foldersWithMatchingDocs.add(topFolderId);
                    break;
                  }
                }
              }
            });
            
            // Filter folders based on matches
            filteredFolders = filteredFolders.filter((folder) => 
              foldersWithMatchingDocs.has(folder.id)
            );
          } else {
            // No documents found in any folder
            filteredFolders = [];
          }
        } catch (error) {
          console.error("[Folder Contents] Error filtering folders by category:", error);
          filteredFolders = [];
        }
      }

      return {
        folders: filteredFolders,
        documents: documentsWithStats,
      };
    },
    enabled: folderId !== null,
  });
}

/**
 * Fetch root level contents (folders and documents without parent)
 */
export function useRootContents(categoryFilter?: string, searchTerm?: string) {
  return useQuery({
    queryKey: ["root-contents", categoryFilter, searchTerm],
    staleTime: 2 * 60 * 1000, // 2 minutes - don't refetch too often
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    queryFn: async (): Promise<FolderContents> => {
      // If searching, search across all documents and folders
      if (searchTerm && searchTerm.trim()) {
        return await searchAllContents(searchTerm.trim(), categoryFilter);
      }

      // Get root folders (handle case where table doesn't exist yet)
      let folders: Folder[] = [];
      try {
        const { data, error: foldersError } = await supabase
          .from("document_folders")
          .select("*")
          .is("parent_folder_id", null)
          .order("name", { ascending: true });

        if (foldersError && foldersError.code !== 'PGRST116' && foldersError.code !== '42P01') {
          throw foldersError;
        }
        folders = (data || []) as Folder[];
      } catch (error: any) {
        // Table doesn't exist yet or other error - return empty folders
        if (error?.code !== '42P01' && error?.code !== 'PGRST116') {
          console.warn("Error fetching folders:", error);
        }
      }

      // Get root documents (no parent folder)
      let documents = [];
      try {
        const { data: documentsData, error: documentsError } = await supabase
          .from("documents")
          .select("*")
          .eq("is_published", true)
          .is("parent_folder_id", null)  // ✅ Filtrar apenas documentos raiz
          .order("published_at", { ascending: false });

        if (documentsError) {
          // Se erro é sobre coluna faltando, retornar vazio
          if (documentsError.code === '42703' || 
              documentsError.message?.includes('parent_folder_id')) {
            console.warn('[Root Contents] Coluna parent_folder_id não existe, retornando documentos vazios');
            return { folders, documents: [] };
          }
          throw documentsError;
        }
        
        documents = documentsData || [];
      } catch (error: any) {
        console.error('[Root Contents] Erro ao buscar documentos raiz:', error);
        // Retornar apenas pastas em caso de erro
        return { folders, documents: [] };
      }

      // Apply category filter with case-insensitive comparison and accent removal
      if (categoryFilter && categoryFilter !== "Todas") {
        const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
        console.log('[useRootContents] Filtering by category:', categoryFilter, '-> normalized:', categoryFilterNormalized);
        console.log('[useRootContents] Total documents before filter:', documents.length);
        console.log('[useRootContents] Sample document categories:', documents.slice(0, 5).map((d: any) => `${d.category} -> ${normalizeCategoryName(d.category)}`));
        
        documents = documents.filter((doc: any) => {
          const docCategoryNormalized = normalizeCategoryName(doc.category || "");
          const matches = docCategoryNormalized === categoryFilterNormalized;
          if (!matches && documents.length <= 10) {
            console.log(`[useRootContents] Document "${doc.title}" category "${doc.category}" (normalized: "${docCategoryNormalized}") does not match filter "${categoryFilterNormalized}"`);
          }
          return matches;
        });
        
        console.log('[useRootContents] Documents after filter:', documents.length);
      }

      // Fetch statistics for documents
      const documentIds = documents.map((doc: any) => doc.id);
      const stats = await fetchDocumentsStats(documentIds);

      // Add statistics to each document
      const documentsWithStats = documents.map((doc: any) => {
        const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
        return {
          ...doc,
          views: docStats.views,
          likes: docStats.likes,
          comments: docStats.comments,
        };
      });

      // Filter folders: only show folders that contain documents matching the category filter
      let filteredFolders = folders;
      if (categoryFilter && categoryFilter !== "Todas" && filteredFolders.length > 0) {
        try {
          const categoryFilterNormalized = normalizeCategoryName(categoryFilter);
          
          // Optimized: Get all subfolder IDs for all folders at once
          const allFolderIds = filteredFolders.map((f) => f.id);
          const allSubfolderIdsMap = new Map<string, string[]>();
          
          // Get all subfolder IDs for all folders in parallel
          await Promise.all(
            allFolderIds.map(async (folderId) => {
              const subfolderIds = await getAllSubfolderIds([folderId]);
              allSubfolderIdsMap.set(folderId, subfolderIds);
            })
          );
          
          // Get all unique subfolder IDs
          const allSubfolderIds = Array.from(new Set(
            Array.from(allSubfolderIdsMap.values()).flat()
          ));
          
          // Single query to get all documents in all folders
          const { data: allFolderDocuments, error: folderDocsError } = await supabase
            .from("documents")
            .select("parent_folder_id, category")
            .in("parent_folder_id", allSubfolderIds)
            .eq("is_published", true);
          
          if (folderDocsError) {
            console.error("[Root Contents] Error fetching documents for folders:", folderDocsError);
            filteredFolders = [];
          } else if (allFolderDocuments && allFolderDocuments.length > 0) {
            // Create a set of folder IDs that have matching documents
            const foldersWithMatchingDocs = new Set<string>();
            
            allFolderDocuments.forEach((doc) => {
              const docCategoryNormalized = normalizeCategoryName(doc.category || "");
              if (docCategoryNormalized === categoryFilterNormalized && doc.parent_folder_id) {
                // Find which top-level folder this document belongs to
                for (const [topFolderId, subfolderIds] of allSubfolderIdsMap.entries()) {
                  if (subfolderIds.includes(doc.parent_folder_id)) {
                    foldersWithMatchingDocs.add(topFolderId);
                    break;
                  }
                }
              }
            });
            
            // Filter folders based on matches
            filteredFolders = filteredFolders.filter((folder) => 
              foldersWithMatchingDocs.has(folder.id)
            );
          } else {
            // No documents found in any folder
            filteredFolders = [];
          }
        } catch (error) {
          console.error("[Root Contents] Error filtering folders by category:", error);
          filteredFolders = [];
        }
      }

      return {
        folders: filteredFolders,
        documents: documentsWithStats,
      };
    },
  });
}

/**
 * Fetch folder path (breadcrumb) by folder ID
 */
export function useFolderPath(folderId: string | null) {
  return useQuery({
    queryKey: ["folder-path", folderId],
    queryFn: async (): Promise<Folder[]> => {
      if (!folderId) return [];

      const path: Folder[] = [];
      let currentFolderId: string | null = folderId;

      // Traverse up the folder hierarchy
      while (currentFolderId) {
        const { data, error } = await supabase
          .from("document_folders")
          .select("*")
          .eq("id", currentFolderId)
          .single();

        if (error || !data) break;

        path.unshift(data as Folder);
        currentFolderId = data.parent_folder_id;
      }

      return path;
    },
    enabled: !!folderId,
  });
}

/**
 * Fetch a single folder by ID
 */
export function useFolderById(folderId: string | null) {
  return useQuery({
    queryKey: ["folder", folderId],
    queryFn: async () => {
      if (!folderId) return null;

      const { data, error } = await supabase
        .from("document_folders")
        .select("*")
        .eq("id", folderId)
        .single();

      if (error) throw error;
      return data as Folder | null;
    },
    enabled: !!folderId,
  });
}

