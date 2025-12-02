import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["app_role"];
type UserSubscription = Database["public"]["Tables"]["user_subscriptions"]["Row"];

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  number?: string | null;
  avatarUrl?: string | null;
  subscription?: UserSubscription | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, number?: string) => Promise<void>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);
  const currentUserRef = useRef<User | null>(null);
  const CACHE_DURATION = 30000; // 30s cache

  // Fetch user profile, role, and subscription (OTIMIZADO - QUERIES PARALELAS)
  const fetchUserData = async (supabaseUser: SupabaseUser, forceRefresh = false) => {
    // Check cache - desabilitar cache no primeiro carregamento ou quando forçado
    // Usar ref para verificar se já foi inicializado, pois user pode não estar atualizado no closure
    if (!forceRefresh && hasInitialized.current && Date.now() - lastFetchTime.current < CACHE_DURATION) {
      return; // Usar dados em cache apenas se já foi inicializado e não forçar refresh
    }

    if (isFetching) {
      return;
    }
    
    setIsFetching(true);
    lastFetchTime.current = Date.now();
    
    // Preservar role atual em caso de erro - usar ref para obter valor atual
    const currentUserRole = currentUserRef.current?.role;
    
    try {
      // OTIMIZAÇÃO 1: Queries PARALELAS com Promise.allSettled
      const QUERY_TIMEOUT = 15000;
      const isTimeoutError = (error: unknown) =>
        error instanceof Error && error.message === "Timeout";

      async function withTimeout<T>(promise: Promise<T>) {
        return Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), QUERY_TIMEOUT)
          ),
        ]);
      }
      
      const [profileResult, roleResult, subscriptionResult] = await Promise.allSettled([
        // Profile query
        (async () => {
          const query = supabase
            .from("profiles")
            .select("*")
            .eq("user_id", supabaseUser.id)
            .maybeSingle();
          return await withTimeout(query as unknown as Promise<any>);
        })(),
        // Role query
        (async () => {
          const query = supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", supabaseUser.id)
            .maybeSingle();
          return await withTimeout(query as unknown as Promise<any>);
        })(),
        // Subscription query
        (async () => {
          const query = supabase
            .from("user_subscriptions")
            .select(`
              *,
              subscription_plans (
                id,
                name,
                price
              )
            `)
            .eq("user_id", supabaseUser.id)
            .order("created_at", { ascending: false })
            .maybeSingle();
          const result = await withTimeout(query as unknown as Promise<any>);
          if (result?.data) {
            console.log('[AUTH] Subscription encontrada:', {
              planId: result.data.plan_id,
              planName: result.data.subscription_plans?.name,
              status: result.data.status,
            });
          }
          return result;
        })()
      ]);

      const metadata = supabaseUser.user_metadata as { name?: string; number?: string };
      const sanitizedMetadataNumber =
        metadata?.number && typeof metadata.number === "string"
          ? metadata.number.replace(/\D/g, "")
          : undefined;

      // Process profile
      let profileData: Profile | null = null;
      if (profileResult.status === 'fulfilled' && (profileResult.value as any).data) {
        profileData = (profileResult.value as any).data;
        if (sanitizedMetadataNumber && profileData.number !== sanitizedMetadataNumber) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update({ number: sanitizedMetadataNumber })
            .eq("user_id", supabaseUser.id)
            .select()
            .single();
          if (!updateError && updatedProfile) {
            profileData = updatedProfile;
          }
        }
      } else if (profileResult.status === 'fulfilled' && (profileResult.value as any).error?.code === 'PGRST116') {
        // Create profile if not exists
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({
            user_id: supabaseUser.id,
            email: supabaseUser.email || "",
            name: metadata?.name || supabaseUser.email?.split('@')[0] || "Usuário",
            number: sanitizedMetadataNumber || null,
          })
          .select()
          .single();
        profileData = newProfile;
      } else if (profileResult.status === 'rejected') {
        if (isTimeoutError(profileResult.reason)) {
          console.warn("⌛ [AUTH] Timeout ao buscar profile, usando dados em cache se disponíveis.");
        } else {
          console.warn("⚠️ [AUTH] Erro ao buscar profile:", profileResult.reason);
        }
      }

      // Process role - melhorar tratamento de erros
      let roleData: any = null;
      
      if (roleResult.status === 'fulfilled') {
        if ((roleResult.value as any).data) {
          // Dados encontrados com sucesso
          roleData = (roleResult.value as any).data;
        } else if ((roleResult.value as any).error?.code === 'PGRST116') {
          // Role não encontrado - criar como "user" apenas neste caso
          console.log("ℹ️ [AUTH] Role não encontrado, criando role padrão 'user'");
          const { data: newRole } = await supabase.from("user_roles").insert({
            user_id: supabaseUser.id,
            role: "user",
          }).select().single();
          roleData = newRole || { role: "user" };
        } else if ((roleResult.value as any).error) {
          // Erro de RLS ou outro erro - não usar fallback, manter role atual ou tentar novamente
          console.error("❌ [AUTH] Erro ao buscar role:", (roleResult.value as any).error);
          // Se houver role atual, usar ele; caso contrário, usar fallback apenas se não houver outro erro
          if (currentUserRole) {
            roleData = { role: currentUserRole };
            console.log("ℹ️ [AUTH] Mantendo role atual devido a erro:", currentUserRole);
          } else {
            // Se não houver role atual e houver erro de RLS, pode ser problema de permissão
            // Tentar uma query mais simples ou usar fallback apenas para novos usuários
            roleData = { role: "user" };
          }
        }
      } else if (roleResult.status === 'rejected') {
        // Timeout ou outro erro de rede - não usar fallback automaticamente
        if (isTimeoutError(roleResult.reason)) {
          console.warn("⌛ [AUTH] Timeout ao buscar role, mantendo valor em cache.");
        } else {
          console.error("❌ [AUTH] Falha na query de role (erro de rede):", roleResult.reason);
        }
        // Se houver role atual, preservar; caso contrário, tentar uma última vez ou usar fallback seguro
        if (currentUserRole) {
          roleData = { role: currentUserRole };
          console.log("ℹ️ [AUTH] Mantendo role atual devido a timeout:", currentUserRole);
        } else {
          // Para novos usuários ou primeiro carregamento com erro, usar fallback
          roleData = { role: "user" };
        }
      }

      // Process subscription
      let subscriptionData = null;
      if (subscriptionResult.status === 'fulfilled' && (subscriptionResult.value as any).data) {
        subscriptionData = (subscriptionResult.value as any).data;
      } else if (subscriptionResult.status === 'fulfilled' && (subscriptionResult.value as any).error) {
        console.warn("⚠️ [AUTH] Erro retornado pela query de subscription:", (subscriptionResult.value as any).error);
      } else if (subscriptionResult.status === 'rejected') {
        if (isTimeoutError(subscriptionResult.reason)) {
          console.warn("⌛ [AUTH] Timeout ao buscar subscription, mantendo dados anteriores.");
        } else {
          console.warn("⚠️ [AUTH] Erro ao buscar subscription:", subscriptionResult.reason);
        }
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || profileData?.email || "",
        name: profileData?.name || metadata?.name || supabaseUser.email?.split('@')[0] || "Usuário",
        role: roleData?.role || currentUserRole || ("user" as UserRole),
        number: profileData?.number || sanitizedMetadataNumber || null,
        avatarUrl: profileData?.avatar_url,
        subscription: subscriptionData || null,
      };

      setUser(userData);
      setProfile(profileData);
      currentUserRef.current = userData;
      hasInitialized.current = true;
    } catch (error) {
      console.error("❌ [AUTH] Erro em fetchUserData:", error);
      // Fallback user apenas se não houver usuário atual preservado
      // Se já houver um usuário com role, manter o role atual
      if (currentUserRole && currentUserRef.current && currentUserRef.current.id === supabaseUser.id) {
        console.log("ℹ️ [AUTH] Mantendo dados do usuário atual devido a erro:", currentUserRole);
        // Manter o estado atual do usuário preservado no ref
        // Não atualizar, apenas deixar como está
      } else {
        // Apenas para casos onde realmente não há dados anteriores
        const metadata = supabaseUser.user_metadata as { name?: string; number?: string };
        const sanitizedMetadataNumber =
          metadata?.number && typeof metadata.number === "string"
            ? metadata.number.replace(/\D/g, "")
            : undefined;
        const fallbackUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          name: supabaseUser.email?.split('@')[0] || "Usuário",
          role: currentUserRole || ("user" as UserRole),
          number: currentUserRef.current?.number || sanitizedMetadataNumber || null,
        };
        setUser(fallbackUser);
        currentUserRef.current = fallbackUser;
        hasInitialized.current = true;
      }
    } finally {
      setIsFetching(false);
      if (!currentUserRef.current) {
        lastFetchTime.current = 0;
      }
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        // Forçar refresh no primeiro carregamento para garantir role correto
        fetchUserData(session.user, true)
          .catch(console.error)
          .finally(() => mounted && setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // OTIMIZAÇÃO 3: Ignorar INITIAL_SESSION (já tratado por getSession)
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (session?.user) {
          // Forçar refresh quando fizer login para garantir dados atualizados
          await fetchUserData(session.user, true).catch(console.error);
          if (mounted) setIsLoading(false);
        } else {
          setUser(null);
          setProfile(null);
          currentUserRef.current = null;
          hasInitialized.current = false;
          lastFetchTime.current = 0;
          if (mounted) setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || "Credenciais inválidas");
    }
  };

  const register = async (email: string, password: string, name: string, number?: string) => {
    const sanitizedNumber = number?.replace(/\D/g, "") || null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          number: sanitizedNumber,
        },
      },
    });

    if (error) {
      throw new Error(error.message || "Erro ao criar conta");
    }

    // Always try to save/update profile with number, even if no session yet
    // The trigger will also handle this, but we ensure it's saved here too
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: data.user.id,
            email,
            name,
            number: sanitizedNumber,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.warn("⚠️ [AUTH] Não foi possível salvar o perfil do usuário:", profileError);
      }
    }

    // If session exists, fetch user data immediately
    if (data.user && data.session) {
      await fetchUserData(data.user, true);
    }
    // If no session (email confirmation required), the trigger will handle profile and subscription creation
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    currentUserRef.current = null;
    hasInitialized.current = false;
    lastFetchTime.current = 0;
  };

  const refreshSubscriptionRef = useRef<Promise<void> | null>(null);
  
  const refreshSubscription = async (retries = 1, delay = 1000) => {
    // Evitar múltiplas chamadas simultâneas
    if (refreshSubscriptionRef.current) {
      console.log('[AUTH] refreshSubscription: Já existe uma atualização em andamento, aguardando...');
      await refreshSubscriptionRef.current;
      return;
    }

    const refreshPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.warn('[AUTH] refreshSubscription: Nenhuma sessão encontrada');
          return;
        }

        // Sempre forçar refresh (bypass cache)
        for (let i = 0; i < retries; i++) {
          try {
            console.log(`[AUTH] refreshSubscription: Tentativa ${i + 1}/${retries}`);
            await fetchUserData(session.user, true);
            
            // Verificar se a subscription foi atualizada
            const { data: subscription } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (subscription) {
              console.log('[AUTH] refreshSubscription: Subscription atualizada com sucesso', {
                planId: subscription.plan_id,
                status: subscription.status,
              });
              return;
            }

            // Se não encontrou subscription e ainda há tentativas, aguardar
            if (i < retries - 1) {
              console.log(`[AUTH] refreshSubscription: Subscription não encontrada, aguardando ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = Math.min(delay * 1.5, 3000);
            }
          } catch (error) {
            console.error(`[AUTH] refreshSubscription: Erro na tentativa ${i + 1}:`, error);
            if (i === retries - 1) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.5, 3000);
          }
        }
      } finally {
        refreshSubscriptionRef.current = null;
      }
    })();

    refreshSubscriptionRef.current = refreshPromise;
    await refreshPromise;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        login,
        register,
        logout,
        refreshSubscription,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
