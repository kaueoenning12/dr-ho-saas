import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch announcements (published for all, all for admins)
export function useAnnouncements(isAdmin?: boolean) {
  return useQuery({
    queryKey: ["announcements", isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      // If not admin, only show published
      if (!isAdmin) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Create announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementData: any) => {
      const { data, error } = await supabase
        .from("announcements")
        .insert(announcementData)
        .select()
        .single();
      if (error) throw error;

      // If published, trigger notification via Edge Function
      if (announcementData.is_published) {
        try {
          await supabase.functions.invoke("create-notifications", {
            body: {
              event_type: "system",
              title: "Novo Aviso",
              message: announcementData.title,
              link: "/announcements",
            },
          });
        } catch (err) {
          console.error("Error creating notifications:", err);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Aviso criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar aviso: " + error.message);
    },
  });
}

// Update announcement
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Get current announcement
      const { data: currentAnnouncement } = await supabase
        .from("announcements")
        .select("is_published")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // If changed from unpublished to published, trigger notifications
      if (!currentAnnouncement?.is_published && updates.is_published) {
        try {
          await supabase.functions.invoke("create-notifications", {
            body: {
              event_type: "system",
              title: "Novo Aviso",
              message: updates.title || data.title,
              link: "/announcements",
            },
          });
        } catch (err) {
          console.error("Error creating notifications:", err);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Aviso atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar aviso: " + error.message);
    },
  });
}

// Delete announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Aviso excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir aviso: " + error.message);
    },
  });
}
