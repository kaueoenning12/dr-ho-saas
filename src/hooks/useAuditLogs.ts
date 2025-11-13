import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async (): Promise<{ logs: AuditLog[]; total: number }> => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      return {
        logs: data || [],
        total: count || 0,
      };
    },
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ["audit-log-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, resource_type, created_at');

      if (error) {
        throw new Error(`Failed to fetch audit log stats: ${error.message}`);
      }

      const stats = {
        totalLogs: data?.length || 0,
        actionsCount: {} as Record<string, number>,
        resourceTypesCount: {} as Record<string, number>,
        logsToday: 0,
        logsThisWeek: 0,
        logsThisMonth: 0,
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      data?.forEach(log => {
        const logDate = new Date(log.created_at);
        
        // Count by action
        stats.actionsCount[log.action] = (stats.actionsCount[log.action] || 0) + 1;
        
        // Count by resource type
        stats.resourceTypesCount[log.resource_type] = (stats.resourceTypesCount[log.resource_type] || 0) + 1;
        
        // Count by time period
        if (logDate >= today) {
          stats.logsToday++;
        }
        if (logDate >= weekAgo) {
          stats.logsThisWeek++;
        }
        if (logDate >= monthAgo) {
          stats.logsThisMonth++;
        }
      });

      return stats;
    },
  });
}












