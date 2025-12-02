import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Fetch all users with profiles (admin only)
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.log("🔍 [USERS] Buscando todos os usuários...");
      
      // 1. Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("❌ [USERS] Erro ao buscar profiles:", profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.log("✅ [USERS] Nenhum usuário encontrado");
        return [];
      }

      // 2. Buscar roles de todos os usuários
      const userIds = profiles.map(p => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) console.error("⚠️ [USERS] Erro ao buscar roles:", rolesError);

      // 3. Buscar subscriptions de todos os usuários
      const { data: subscriptions, error: subsError } = await supabase
        .from("user_subscriptions")
        .select("user_id, status, plan_id, started_at, expires_at")
        .in("user_id", userIds);

      if (subsError) console.error("⚠️ [USERS] Erro ao buscar subscriptions:", subsError);

      // 4. Juntar dados
      const users = profiles.map(profile => ({
        ...profile,
        user_roles: roles?.filter(r => r.user_id === profile.user_id) || [],
        user_subscriptions: subscriptions?.filter(s => s.user_id === profile.user_id) || []
      }));

      console.log("✅ [USERS] Usuários encontrados:", users.length);
      return users;
    },
  });
}

// Fetch single user by ID
export function useUserById(userId: string | null) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      console.log("🔍 [USER] Buscando usuário:", userId);
      
      // 1. Buscar profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        console.error("❌ [USER] Erro ao buscar profile:", profileError);
        throw profileError;
      }

      if (!profile) {
        console.log("⚠️ [USER] Usuário não encontrado");
        return null;
      }

      // 2. Buscar roles do usuário
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("user_id", userId);

      if (rolesError) console.error("⚠️ [USER] Erro ao buscar roles:", rolesError);

      // 3. Buscar subscription do usuário
      const { data: subscriptions, error: subsError } = await supabase
        .from("user_subscriptions")
        .select("user_id, status, plan_id, started_at, expires_at")
        .eq("user_id", userId);

      if (subsError) console.error("⚠️ [USER] Erro ao buscar subscription:", subsError);

      // 4. Juntar dados
      const user = {
        ...profile,
        user_roles: roles || [],
        user_subscriptions: subscriptions || []
      };

      console.log("✅ [USER] Usuário encontrado:", user.name);
      return user;
    },
    enabled: !!userId,
  });
}

// Update user role (admin only)
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Database["public"]["Enums"]["app_role"] }) => {
      // Check if user has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", existingRole.id);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Função do usuário atualizada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar função: " + error.message);
    },
  });
}

// Fetch user activity
export function useUserActivity(userId: string | null) {
  return useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      if (!userId) return { views: 0, comments: 0, likes: 0 };

      const [viewsRes, commentsRes, likesRes] = await Promise.all([
        supabase
          .from("document_views")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("document_comments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("document_likes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      return {
        views: viewsRes.count || 0,
        comments: commentsRes.count || 0,
        likes: likesRes.count || 0,
      };
    },
    enabled: !!userId,
  });
}
