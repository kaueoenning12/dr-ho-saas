import { supabase } from "@/integrations/supabase/client";
import { checkResourceAccess } from "@/lib/middleware/subscriptionGuard";

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_published: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
}

export interface DocumentFilters {
  category?: string;
  searchTerm?: string;
  showOnlyNew?: boolean;
  isPublished?: boolean;
  limit?: number;
  offset?: number;
}

export interface DocumentStats {
  total_documents: number;
  total_views: number;
  total_likes: number;
  category_counts: Record<string, number>;
}

export class DocumentService {
  /**
   * Get documents with filters and pagination
   */
  static async getDocuments(
    filters: DocumentFilters = {},
    userId?: string
  ): Promise<{ documents: Document[]; total: number }> {
    // Check subscription access if user is provided
    if (userId) {
      const hasAccess = await checkResourceAccess(userId, 'document');
      if (!hasAccess) {
        throw new Error('Subscription required to access documents');
      }
    }

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.category && filters.category !== 'Todas') {
      query = query.eq('category', filters.category);
    }

    if (filters.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }

    if (filters.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    }

    if (filters.showOnlyNew) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('created_at', thirtyDaysAgo.toISOString());
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return {
      documents: data || [],
      total: count || 0,
    };
  }

  /**
   * Get a single document by ID
   */
  static async getDocumentById(documentId: string, userId?: string): Promise<Document | null> {
    // Check subscription access if user is provided
    if (userId) {
      const hasAccess = await checkResourceAccess(userId, 'document');
      if (!hasAccess) {
        throw new Error('Subscription required to access documents');
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch document: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Increment document view count
   */
  static async incrementViewCount(documentId: string, userId?: string): Promise<void> {
    // Check subscription access if user is provided
    if (userId) {
      const hasAccess = await checkResourceAccess(userId, 'document');
      if (!hasAccess) {
        throw new Error('Subscription required to view documents');
      }
    }

    const { error } = await supabase.rpc('increment_document_views', {
      document_id: documentId,
    });

    if (error) {
      console.error('Failed to increment view count:', error);
    }
  }

  /**
   * Toggle document like
   */
  static async toggleLike(documentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    // Check subscription access
    const hasAccess = await checkResourceAccess(userId, 'document');
    if (!hasAccess) {
      throw new Error('Subscription required to like documents');
    }

    // Check if user already liked this document
    const { data: existingLike } = await supabase
      .from('document_likes')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike the document
      const { error: unlikeError } = await supabase
        .from('document_likes')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId);

      if (unlikeError) {
        throw new Error(`Failed to unlike document: ${unlikeError.message}`);
      }

      // Decrement like count
      const { error: decrementError } = await supabase.rpc('decrement_document_likes', {
        document_id: documentId,
      });

      if (decrementError) {
        console.error('Failed to decrement like count:', decrementError);
      }

      return { liked: false, likeCount: 0 }; // Will be updated by refetch
    } else {
      // Like the document
      const { error: likeError } = await supabase
        .from('document_likes')
        .insert({
          document_id: documentId,
          user_id: userId,
        });

      if (likeError) {
        throw new Error(`Failed to like document: ${likeError.message}`);
      }

      // Increment like count
      const { error: incrementError } = await supabase.rpc('increment_document_likes', {
        document_id: documentId,
      });

      if (incrementError) {
        console.error('Failed to increment like count:', incrementError);
      }

      return { liked: true, likeCount: 1 }; // Will be updated by refetch
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(): Promise<DocumentStats> {
    const { data, error } = await supabase
      .from('documents')
      .select('view_count, like_count, category')
      .eq('is_published', true);

    if (error) {
      throw new Error(`Failed to fetch document stats: ${error.message}`);
    }

    const stats: DocumentStats = {
      total_documents: data?.length || 0,
      total_views: 0,
      total_likes: 0,
      category_counts: {},
    };

    data?.forEach((doc: any) => {
      stats.total_views += doc.view_count || 0;
      stats.total_likes += doc.like_count || 0;
      
      const category = doc.category || 'Outros';
      stats.category_counts[category] = (stats.category_counts[category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get user's liked documents
   */
  static async getUserLikedDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('document_likes')
      .select(`
        documents (*)
      `)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch liked documents: ${error.message}`);
    }

    return data?.map((like: any) => like.documents).filter(Boolean) || [];
  }

  /**
   * Search documents with full-text search
   */
  static async searchDocuments(
    searchTerm: string,
    filters: Omit<DocumentFilters, 'searchTerm'> = {},
    userId?: string
  ): Promise<{ documents: Document[]; total: number }> {
    // Check subscription access if user is provided
    if (userId) {
      const hasAccess = await checkResourceAccess(userId, 'document');
      if (!hasAccess) {
        throw new Error('Subscription required to search documents');
      }
    }

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .textSearch('title,description', searchTerm);

    // Apply additional filters
    if (filters.category && filters.category !== 'Todas') {
      query = query.eq('category', filters.category);
    }

    if (filters.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }

    return {
      documents: data || [],
      total: count || 0,
    };
  }

  /**
   * Log document access for audit
   */
  static async logDocumentAccess(
    action: string,
    documentId: string,
    userId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase.rpc('log_audit_event', {
      p_action: action,
      p_resource_type: 'document',
      p_resource_id: documentId,
      p_details: {
        user_id: userId,
        ...details,
      },
    });

    if (error) {
      console.error('Failed to log document access:', error);
    }
  }

  /** Update document fields */
  static async updateDocument(
    id: string,
    payload: Partial<{
      title: string;
      description: string | null;
      category: string;
      keywords: string[] | null;
      pdf_url: string | null;
      is_published: boolean;
    }>,
  ): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /** Delete a document by ID */
  static async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
}










