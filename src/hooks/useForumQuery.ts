import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch forum categories
export function useForumCategories() {
  return useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch forum topics (queries separadas para evitar erro 400)
export function useForumTopics(categoryId?: string) {
  return useQuery({
    queryKey: ["forum-topics", categoryId],
    queryFn: async () => {
      // 1. Buscar topics
      let query = supabase
        .from("forum_topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (categoryId && categoryId !== "all") {
        query = query.eq("category_id", categoryId);
      }

      const { data: topics, error } = await query;
      if (error) throw error;
      if (!topics || topics.length === 0) return [];

      // 2. Buscar profiles dos autores
      const authorIds = [...new Set(topics.map(t => t.author_id).filter(Boolean))];
      if (authorIds.length === 0) return topics;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", authorIds);

      // 3. Combinar dados
      return topics.map(topic => ({
        ...topic,
        author: profiles?.find(p => p.user_id === topic.author_id) || null
      }));
    },
  });
}

// Fetch single topic with replies (queries separadas para evitar erro 400)
export function useForumTopicById(topicId: string | null) {
  return useQuery({
    queryKey: ["forum-topic", topicId],
    queryFn: async () => {
      if (!topicId) return null;
      
      // 1. Buscar topic
      const { data: topic, error } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", topicId)
        .single();
      if (error) throw error;
      if (!topic) return null;

      // 2. Buscar profile do autor
      if (topic.author_id) {
        const { data: author } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .eq("user_id", topic.author_id)
          .maybeSingle();
        
        return { ...topic, author };
      }
      
      return topic;
    },
    enabled: !!topicId,
  });
}

// Fetch topic replies (queries separadas para evitar erro 400)
export function useTopicReplies(topicId: string | null) {
  return useQuery({
    queryKey: ["topic-replies", topicId],
    queryFn: async () => {
      if (!topicId) return [];
      
      // 1. Buscar replies
      const { data: replies, error } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!replies || replies.length === 0) return [];

      // 2. Buscar profiles dos autores
      const authorIds = [...new Set(replies.map(r => r.author_id).filter(Boolean))];
      if (authorIds.length === 0) return replies;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", authorIds);

      // 3. Combinar dados
      return replies.map(reply => ({
        ...reply,
        author: profiles?.find(p => p.user_id === reply.author_id) || null
      }));
    },
    enabled: !!topicId,
  });
}

// Create topic
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicData: any) => {
      const { data, error } = await supabase
        .from("forum_topics")
        .insert(topicData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("Tópico criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar tópico: " + error.message);
    },
  });
}

// Update topic
export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("forum_topics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      queryClient.invalidateQueries({ queryKey: ["forum-topic"] });
      toast.success("Tópico atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar tópico: " + error.message);
    },
  });
}

// Create reply
export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyData: any) => {
      const { data, error } = await supabase
        .from("forum_replies")
        .insert(replyData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-replies"] });
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("Resposta adicionada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar resposta: " + error.message);
    },
  });
}

// Vote on reply
export function useVoteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      replyId,
      userId,
      voteType,
    }: {
      replyId: string;
      userId: string;
      voteType: "upvote" | "downvote";
    }) => {
      // Check if already voted
      const { data: existingVote } = await supabase
        .from("forum_reply_votes")
        .select("*")
        .eq("reply_id", replyId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          const { error } = await supabase
            .from("forum_reply_votes")
            .delete()
            .eq("id", existingVote.id);
          if (error) throw error;
        } else {
          // Change vote
          const { error } = await supabase
            .from("forum_reply_votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id);
          if (error) throw error;
        }
      } else {
        // Add vote
        const { error } = await supabase
          .from("forum_reply_votes")
          .insert({ reply_id: replyId, user_id: userId, vote_type: voteType });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-replies"] });
    },
  });
}

// Mark reply as solution
export function useMarkSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ replyId, topicId }: { replyId: string; topicId: string }) => {
      // Mark reply as solution
      const { error: replyError } = await supabase
        .from("forum_replies")
        .update({ is_solution: true })
        .eq("id", replyId);
      if (replyError) throw replyError;

      // Mark topic as resolved (you may need to add this column)
      // const { error: topicError } = await supabase
      //   .from("forum_topics")
      //   .update({ is_resolved: true })
      //   .eq("id", topicId);
      // if (topicError) throw topicError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topic-replies"] });
      queryClient.invalidateQueries({ queryKey: ["forum-topic"] });
      toast.success("Solução marcada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar solução: " + error.message);
    },
  });
}

// Increment topic views
export function useIncrementTopicViews() {
  return useMutation({
    mutationFn: async (topicId: string) => {
      // Get current views
      const { data: topic } = await supabase
        .from("forum_topics")
        .select("views")
        .eq("id", topicId)
        .single();

      if (topic) {
        const { error } = await supabase
          .from("forum_topics")
          .update({ views: (topic.views || 0) + 1 })
          .eq("id", topicId);
        if (error) throw error;
      }
    },
  });
}
