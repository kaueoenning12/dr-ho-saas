import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    new_document: number;
    comment: number;
    like: number;
    system: number;
  };
  readRate: number;
}

export function useNotificationStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-stats", user?.id],
    queryFn: async (): Promise<NotificationStats> => {
      if (!user) {
        return {
          total: 0,
          unread: 0,
          byType: { new_document: 0, comment: 0, like: 0, system: 0 },
          readRate: 0,
        };
      }

      // Fetch all notifications
      const { data: allNotifications, error: allError } = await supabase
        .from("notifications")
        .select("type, read");

      if (allError) throw allError;

      const total = allNotifications?.length || 0;
      const unread = allNotifications?.filter((n) => !n.read).length || 0;

      // Count by type
      const byType = {
        new_document: 0,
        comment: 0,
        like: 0,
        system: 0,
      };

      allNotifications?.forEach((n) => {
        if (n.type in byType) {
          byType[n.type as keyof typeof byType]++;
        }
      });

      const readRate = total > 0 ? ((total - unread) / total) * 100 : 0;

      return {
        total,
        unread,
        byType,
        readRate: Math.round(readRate),
      };
    },
    enabled: !!user,
  });
}
