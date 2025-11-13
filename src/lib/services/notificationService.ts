import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'subscription' | 'document';
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: Notification['type'];
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  by_type: Record<string, number>;
}

export class NotificationService {
  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return {
      notifications: data || [],
      total: count || 0,
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Create notification
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        metadata: metadata || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Create notification from template
   */
  static async createNotificationFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, string> = {},
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error('Notification template not found or inactive');
    }

    // Replace variables in title and message
    let title = template.title;
    let message = template.message;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return this.createNotification(
      userId,
      title,
      message,
      template.type,
      actionUrl,
      metadata
    );
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    const { data, error } = await supabase
      .from('notifications')
      .select('type, is_read')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch notification stats: ${error.message}`);
    }

    const stats: NotificationStats = {
      total_notifications: data?.length || 0,
      unread_count: 0,
      by_type: {},
    };

    data?.forEach((notification: any) => {
      if (!notification.is_read) {
        stats.unread_count++;
      }
      
      const type = notification.type || 'info';
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Send subscription-related notifications
   */
  static async sendSubscriptionNotification(
    userId: string,
    event: 'created' | 'renewed' | 'cancelled' | 'expired' | 'payment_failed',
    details: Record<string, any> = {}
  ): Promise<void> {
    const templates = {
      created: {
        title: 'Assinatura Ativada! 🎉',
        message: 'Sua assinatura do Doutor HO foi ativada com sucesso. Agora você tem acesso completo a todos os relatórios.',
        type: 'success' as const,
      },
      renewed: {
        title: 'Assinatura Renovada',
        message: 'Sua assinatura foi renovada automaticamente. Obrigado por continuar conosco!',
        type: 'success' as const,
      },
      cancelled: {
        title: 'Assinatura Cancelada',
        message: 'Sua assinatura foi cancelada. Você ainda tem acesso até o final do período atual.',
        type: 'warning' as const,
      },
      expired: {
        title: 'Assinatura Expirada',
        message: 'Sua assinatura expirou. Renove agora para continuar acessando os relatórios.',
        type: 'error' as const,
      },
      payment_failed: {
        title: 'Falha no Pagamento',
        message: 'Houve um problema com o pagamento da sua assinatura. Atualize seus dados de pagamento.',
        type: 'error' as const,
      },
    };

    const template = templates[event];
    if (!template) {
      throw new Error(`Unknown subscription event: ${event}`);
    }

    await this.createNotification(
      userId,
      template.title,
      template.message,
      template.type,
      '/billing',
      details
    );
  }

  /**
   * Send document-related notifications
   */
  static async sendDocumentNotification(
    userId: string,
    event: 'new_document' | 'document_updated',
    documentTitle: string,
    documentId: string
  ): Promise<void> {
    const templates = {
      new_document: {
        title: 'Novo Relatório Disponível! 📄',
        message: `Um novo relatório foi adicionado: "${documentTitle}". Confira agora!`,
        type: 'document' as const,
      },
      document_updated: {
        title: 'Relatório Atualizado',
        message: `O relatório "${documentTitle}" foi atualizado com novas informações.`,
        type: 'document' as const,
      },
    };

    const template = templates[event];
    if (!template) {
      throw new Error(`Unknown document event: ${event}`);
    }

    await this.createNotification(
      userId,
      template.title,
      template.message,
      template.type,
      `/documents/${documentId}`,
      { document_id: documentId, document_title: documentTitle }
    );
  }

  /**
   * Bulk create notifications for multiple users
   */
  static async createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl,
      metadata: metadata || {},
      is_read: false,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq('is_read', true);

    if (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }
}












