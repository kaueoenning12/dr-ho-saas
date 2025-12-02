import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/types/database";

const NOTIFICATIONS_QUERY_KEY = ["notifications"];

// Fetch all notifications for the current user
export function useUserNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!user,
  });
}

// Get unread notification count
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id, "unread-count"],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("Error fetching unread count:", error);
        throw error;
      }

      return count || 0;
    },
    enabled: !!user,
  });
}

// Mark a single notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user?.id || "");

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });

      const previousNotifications = queryClient.getQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id]);

      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], (old: Notification[] = []) =>
        old.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      return { previousNotifications };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], context?.previousNotifications);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
      console.error("Error marking notification as read:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id, "unread-count"] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });

      const previousNotifications = queryClient.getQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id]);

      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], (old: Notification[] = []) =>
        old.map((n) => ({ ...n, read: true }))
      );

      return { previousNotifications };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], context?.previousNotifications);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
      console.error("Error marking all notifications as read:", error);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id, "unread-count"] });
    },
  });
}

// Create a new notification (for admin/system use)
export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notification: Omit<Notification, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("notifications")
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create notification",
        variant: "destructive",
      });
      console.error("Error creating notification:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

// Delete a notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user?.id || "");

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });

      const previousNotifications = queryClient.getQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id]);

      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], (old: Notification[] = []) =>
        old.filter((n) => n.id !== notificationId)
      );

      return { previousNotifications };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, user?.id], context?.previousNotifications);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
      console.error("Error deleting notification:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, user?.id, "unread-count"] });
    },
  });
}
