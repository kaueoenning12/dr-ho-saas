import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchDocumentsStats, type DocumentStats } from "./useDocumentsQuery";

type Folder = Database["public"]["Tables"]["document_folders"]["Row"];

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
export function useFolderContents(folderId: string | null) {
  return useQuery({
    queryKey: ["folder-contents", folderId],
    queryFn: async (): Promise<FolderContents> => {
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

      // Fetch statistics for documents
      const documentIds = (documents || []).map((doc) => doc.id);
      const stats = await fetchDocumentsStats(documentIds);

      // Add statistics to each document
      const documentsWithStats = (documents || []).map((doc) => {
        const docStats = stats[doc.id] || { views: 0, likes: 0, comments: 0 };
        return {
          ...doc,
          views: docStats.views,
          likes: docStats.likes,
          comments: docStats.comments,
        };
      });

      return {
        folders: (folders || []) as Folder[],
        documents: documentsWithStats,
      };
    },
    enabled: folderId !== null,
  });
}

/**
 * Fetch root level contents (folders and documents without parent)
 */
export function useRootContents() {
  return useQuery({
    queryKey: ["root-contents"],
    queryFn: async (): Promise<FolderContents> => {
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

      return {
        folders,
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

