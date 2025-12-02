import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Notification } from "@/types/database";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useUserNotifications,
  useUnreadCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useCreateNotification,
} from "@/hooks/useNotificationsQuery";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "user_id">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // React Query hooks
  const { data: notifications = [], isLoading } = useUserNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const createNotificationMutation = useCreateNotification();

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    } else if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if (notificationPermission === "granted" && "Notification" in window) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.link) {
          window.location.href = notification.link;
        }
        browserNotification.close();
      };
    }
  };

  // Real-time subscription for new notifications with retry logic
  useEffect(() => {
    if (!user) return;

    let channel: any;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = (count: number) => Math.min(1000 * Math.pow(2, count), 30000);

    const subscribeWithRetry = () => {
      channel = supabase
        .channel(`notifications-changes-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            
            // Show browser notification
            showBrowserNotification(newNotification);
            
            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0; // Reset retry count on successful connection
            if (import.meta.env.DEV) {
              console.log('📡 [NOTIFICATIONS] WebSocket conectado com sucesso');
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = retryDelay(retryCount);
              if (import.meta.env.DEV) {
                console.warn(`📡 [NOTIFICATIONS] Erro na conexão WebSocket, tentando novamente em ${delay}ms (tentativa ${retryCount}/${maxRetries})`);
              }
              setTimeout(subscribeWithRetry, delay);
            } else {
              if (import.meta.env.DEV) {
                console.error('📡 [NOTIFICATIONS] Máximo de tentativas de reconexão atingido');
              }
            }
          }
        });
    };

    subscribeWithRetry();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast, notificationPermission]);

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const addNotification = (notification: Omit<Notification, "id" | "user_id">) => {
    if (user) {
      createNotificationMutation.mutate({
        ...notification,
        user_id: user.id,
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
