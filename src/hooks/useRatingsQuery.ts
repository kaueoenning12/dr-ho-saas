import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RatingWithDetails {
  id: string;
  user_id: string;
  document_id: string;
  rating: number;
  unlocked_at: string | null;
  created_at: string | null;
  profile: {
    name: string;
    email: string;
  } | null;
  document: {
    title: string;
    category: string;
  } | null;
}

// Fetch all ratings with user and document details (admin only)
export function useRatings() {
  return useQuery({
    queryKey: ["ratings"],
    queryFn: async () => {
      console.log("🔍 [RATINGS] Buscando todas as avaliações...");

      // 1. Buscar todas as avaliações
      const { data: unlocks, error: unlocksError } = await supabase
        .from("document_unlocks")
        .select("*")
        .order("created_at", { ascending: false });

      if (unlocksError) {
        console.error("❌ [RATINGS] Erro ao buscar avaliações:", unlocksError);
        throw unlocksError;
      }

      if (!unlocks || unlocks.length === 0) {
        console.log("✅ [RATINGS] Nenhuma avaliação encontrada");
        return [];
      }

      // 2. Buscar profiles dos usuários
      const userIds = [...new Set(unlocks.map((u: any) => u.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("⚠️ [RATINGS] Erro ao buscar profiles:", profilesError);
      }

      // 3. Buscar documentos
      const documentIds = [...new Set(unlocks.map((u: any) => u.document_id))];
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("id, title, category")
        .in("id", documentIds);

      if (documentsError) {
        console.error("⚠️ [RATINGS] Erro ao buscar documentos:", documentsError);
      }

      // 4. Juntar dados
      const ratings: RatingWithDetails[] = unlocks.map((unlock: any) => {
        const profile = profiles?.find((p: any) => p.user_id === unlock.user_id);
        const document = documents?.find((d: any) => d.id === unlock.document_id);

        return {
          id: unlock.id,
          user_id: unlock.user_id,
          document_id: unlock.document_id,
          rating: unlock.rating,
          unlocked_at: unlock.unlocked_at,
          created_at: unlock.created_at,
          profile: profile
            ? {
                name: profile.name || "Usuário",
                email: profile.email || "",
              }
            : null,
          document: document
            ? {
                title: document.title || "Documento",
                category: document.category || "",
              }
            : null,
        };
      });

      console.log("✅ [RATINGS] Avaliações encontradas:", ratings.length);
      return ratings;
    },
  });
}

