import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Event } from "@/types/database";

// Fetch events from Supabase
export function useEvents(isAdmin?: boolean) {
  return useQuery({
    queryKey: ["events", isAdmin],
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      
      // Se não for admin, apenas mostrar eventos publicados e futuros
      // RLS já filtra, mas adicionamos filtros extras para consistência
      if (!isAdmin) {
        const today = new Date().toISOString().split("T")[0];
        query = query
          .eq("is_published", true)
          .gte("event_date", today);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching events:", error);
        throw error;
      }
      
      return data || [];
    },
  });
}

// Create event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Omit<Event, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.event_date,
          is_published: eventData.is_published,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });
}

// Update event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Event> }) => {
      const { data, error } = await supabase
        .from("events")
        .update({
          title: updates.title,
          description: updates.description,
          event_date: updates.event_date,
          is_published: updates.is_published,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar evento: " + error.message);
    },
  });
}

// Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });
}
