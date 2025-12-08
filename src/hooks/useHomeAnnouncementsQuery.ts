import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HomeAnnouncement } from "@/types/database";

// Fetch home announcements from Supabase
export function useHomeAnnouncements(isAdmin?: boolean) {
  return useQuery({
    queryKey: ["home-announcements", isAdmin],
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      let query = supabase
        .from("home_announcements")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      
      // Se não for admin, apenas mostrar publicados (RLS já filtra)
      if (!isAdmin) {
        query = query.eq("is_published", true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching home announcements:", error);
        throw error;
      }
      
      // Map database columns to interface
      return (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        priority: item.priority as "low" | "medium" | "high",
        order: item.display_order,
        is_published: item.is_published,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as HomeAnnouncement[];
    },
  });
}

// Create home announcement
export function useCreateHomeAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementData: Omit<HomeAnnouncement, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("home_announcements")
        .insert({
          title: announcementData.title,
          content: announcementData.content,
          priority: announcementData.priority,
          display_order: announcementData.order,
          is_published: announcementData.is_published,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        order: data.display_order,
      } as HomeAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-announcements"] });
      toast.success("Aviso da Home criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar aviso: " + error.message);
    },
  });
}

// Update home announcement
export function useUpdateHomeAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HomeAnnouncement> }) => {
      const updateData: Record<string, any> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.order !== undefined) updateData.display_order = updates.order;
      if (updates.is_published !== undefined) updateData.is_published = updates.is_published;
      
      const { data, error } = await supabase
        .from("home_announcements")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        order: data.display_order,
      } as HomeAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-announcements"] });
      toast.success("Aviso atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar aviso: " + error.message);
    },
  });
}

// Delete home announcement
export function useDeleteHomeAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("home_announcements")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-announcements"] });
      toast.success("Aviso excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir aviso: " + error.message);
    },
  });
}
