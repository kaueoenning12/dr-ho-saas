import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { 
  saveUserDataToCache, 
  getUserDataFromCache, 
  clearUserCache,
  getLastCachedUserId,
  loadUserDataFromCacheSync
} from "@/lib/utils/userCache";

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
  resetPassword: (email: string) => Promise<void>;
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
  const queryClient = useQueryClient();
  
  // OTIMIZAÇÃO: Carregar cache síncronamente no estado inicial
  // Isso elimina o delay do getSession() quando temos cache válido
  const initializeFromCache = (): { user: User | null; profile: Profile | null; hasCache: boolean } => {
    try {
      // Tentar encontrar o último userId no cache
      const lastUserId = getLastCachedUserId();
      if (lastUserId) {
        const cachedData = loadUserDataFromCacheSync(lastUserId);
        if (cachedData) {
          return {
            user: cachedData.user as User,
            profile: cachedData.profile as Profile,
            hasCache: true,
          };
        }
      }
    } catch (error) {
      console.warn('[AuthContext] Erro ao inicializar do cache:', error);
    }
    return { user: null, profile: null, hasCache: false };
  };

  const initialCache = initializeFromCache();
  const [user, setUser] = useState<User | null>(initialCache.user);
  const [profile, setProfile] = useState<Profile | null>(initialCache.profile);
  const [isLoading, setIsLoading] = useState(!initialCache.hasCache);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const hasInitialized = useRef<boolean>(initialCache.hasCache); // Já inicializado se temos cache
  const currentUserRef = useRef<User | null>(initialCache.user); // Inicializar com dados do cache
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos cache em memória (cache persistente é gerenciado separadamente)

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
      // OTIMIZAÇÃO: Criar userData inicial imediatamente com dados básicos do supabaseUser
      // Profile, role e subscription serão carregados em background e atualizados quando disponíveis
      const metadata = supabaseUser.user_metadata as { name?: string; number?: string };
      const sanitizedMetadataNumber =
        metadata?.number && typeof metadata.number === "string"
          ? metadata.number.replace(/\D/g, "")
          : undefined;

      // Criar userData inicial com dados básicos (não bloqueia)
      const initialUserData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: metadata?.name || supabaseUser.email?.split('@')[0] || "Usuário",
        role: currentUserRole || ("user" as UserRole),
        number: sanitizedMetadataNumber || currentUserRef.current?.number || null,
        avatarUrl: currentUserRef.current?.avatarUrl || null,
        subscription: currentUserRef.current?.subscription || null,
      };

      setUser(initialUserData);
      currentUserRef.current = initialUserData;
      hasInitialized.current = true;

      // Carregar profile, role e subscription em background (não bloqueia)
      // Atualizar user quando cada um carregar
      (async () => {
        const QUERY_TIMEOUT = 5000; // 5 segundos
        const isTimeoutError = (error: unknown) =>
          error instanceof Error && error.message === "Timeout";

        async function withTimeout<T>(promise: Promise<T>, timeout: number = QUERY_TIMEOUT) {
          return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), timeout)
            ),
          ]);
        }

        // Buscar profile em background
        (async () => {
          try {
            const query = supabase
              .from("profiles")
              .select("*")
              .eq("user_id", supabaseUser.id)
              .maybeSingle();
            
            const result = await withTimeout(query as unknown as Promise<any>);
            
            if (result?.data) {
              let profileData = result.data;
              
              // Atualizar número se necessário
              if (sanitizedMetadataNumber && profileData.number !== sanitizedMetadataNumber) {
                const { data: updatedProfile } = await supabase
                  .from("profiles")
                  .update({ number: sanitizedMetadataNumber })
                  .eq("user_id", supabaseUser.id)
                  .select()
                  .single();
                if (updatedProfile) {
                  profileData = updatedProfile;
                }
              }
              
              // Atualizar user quando profile carregar
              if (currentUserRef.current) {
                const updatedUser = {
                  ...currentUserRef.current,
                  name: profileData.name || currentUserRef.current.name,
                  number: profileData.number || currentUserRef.current.number,
                  avatarUrl: profileData.avatar_url || currentUserRef.current.avatarUrl,
                };
                setUser(updatedUser);
                setProfile(profileData);
                currentUserRef.current = updatedUser;
              }
            } else if (result?.error?.code === 'PGRST116') {
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
              
              if (newProfile && currentUserRef.current) {
                const updatedUser = {
                  ...currentUserRef.current,
                  name: newProfile.name || currentUserRef.current.name,
                  number: newProfile.number || currentUserRef.current.number,
                };
                setUser(updatedUser);
                setProfile(newProfile);
                currentUserRef.current = updatedUser;
              }
            }
          } catch (error) {
            // Silenciosamente falhar - usar dados do cache se disponíveis
            if (isTimeoutError(error)) {
              console.log('[AUTH] Profile será carregado do cache ou em próxima tentativa');
            }
          }
        })();

        // Buscar role em background
        (async () => {
          try {
            const query = supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", supabaseUser.id)
              .maybeSingle();
            
            const result = await withTimeout(query as unknown as Promise<any>);
            
            if (result?.data) {
              const roleData = result.data;
              
              // Atualizar user quando role carregar
              if (currentUserRef.current) {
                const updatedUser = {
                  ...currentUserRef.current,
                  role: roleData.role as UserRole,
                };
                setUser(updatedUser);
                currentUserRef.current = updatedUser;
              }
            } else if (result?.error?.code === 'PGRST116') {
              // Create role if not exists
              const { data: newRole } = await supabase.from("user_roles").insert({
                user_id: supabaseUser.id,
                role: "user",
              }).select().single();
              
              if (newRole && currentUserRef.current) {
                const updatedUser = {
                  ...currentUserRef.current,
                  role: (newRole.role || "user") as UserRole,
                };
                setUser(updatedUser);
                currentUserRef.current = updatedUser;
              }
            }
          } catch (error) {
            // Silenciosamente falhar - manter role atual
            if (isTimeoutError(error)) {
              console.log('[AUTH] Role será mantido do cache ou padrão');
            }
          }
        })();

        // Buscar subscription em background
        (async () => {
          try {
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
              // Log removido para não expor dados sensíveis de assinatura
              if (import.meta.env.DEV) {
                console.log('[AUTH] Subscription encontrada');
              }
              
              // Atualizar user quando subscription carregar
              if (currentUserRef.current) {
                const updatedUser = {
                  ...currentUserRef.current,
                  subscription: result.data
                };
                setUser(updatedUser);
                currentUserRef.current = updatedUser;
              }
            }
          } catch (error) {
            // Silenciosamente falhar - o hook useUserSubscription no Settings fará o fallback
            if (isTimeoutError(error)) {
              console.log('[AUTH] Subscription será carregada pelo hook useUserSubscription no Settings');
            }
          }
        })();

        // Salvar no cache persistente após um delay (para dar tempo das queries carregarem)
        setTimeout(() => {
          if (currentUserRef.current) {
            saveUserDataToCache(supabaseUser.id, {
              profile: currentUserRef.current as any,
              role: currentUserRef.current.role,
              subscription: currentUserRef.current.subscription,
            });
          }
        }, 2000);
      })();
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
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        // Se já inicializamos do cache e o userId é o mesmo, apenas validar/atualizar em background
        if (initialCache.hasCache && currentUserRef.current?.id === session.user.id) {
          // Dados já foram carregados do cache síncronamente
          // Apenas fazer fetch em background para atualizar se necessário
          fetchUserData(session.user, false)
            .catch(console.error);
        } else {
          // Usuário diferente ou sem cache inicial, fazer fetch normalmente
          const cachedData = getUserDataFromCache(session.user.id);
          
          if (cachedData) {
            // Usar dados do cache imediatamente
            const cachedUser: User = {
              id: session.user.id,
              email: session.user.email || cachedData.profile?.email || "",
              name: cachedData.profile?.name || session.user.email?.split('@')[0] || "Usuário",
              role: (cachedData.role || "user") as UserRole,
              number: cachedData.profile?.number || null,
              avatarUrl: cachedData.profile?.avatar_url || null,
              subscription: cachedData.subscription || null,
            };
            
            setUser(cachedUser);
            setProfile(cachedData.profile);
            currentUserRef.current = cachedUser;
            hasInitialized.current = true;
            setIsLoading(false);
            
            // Fazer fetch em background para atualizar dados
            fetchUserData(session.user, false)
              .catch(console.error);
          } else {
            // Sem cache, fazer fetch normalmente
            fetchUserData(session.user, true)
              .catch(console.error)
              .finally(() => mounted && setIsLoading(false));
          }
        }
      } else {
        // Sem sessão - limpar estado se tínhamos cache
        if (initialCache.hasCache) {
          setUser(null);
          setProfile(null);
          currentUserRef.current = null;
          hasInitialized.current = false;
        }
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Log auth state changes apenas em desenvolvimento (sem expor ID do usuário)
        if (import.meta.env.DEV) {
          console.log('[AUTH] Auth state changed:', event);
        }
        
        // OTIMIZAÇÃO 3: Ignorar INITIAL_SESSION (já tratado por getSession)
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (session?.user) {
          // Forçar refresh quando fizer login para garantir dados atualizados
          await fetchUserData(session.user, true).catch(console.error);
          if (mounted) setIsLoading(false);
        } else {
          // Limpar cache ao fazer logout
          if (currentUserRef.current) {
            clearUserCache(currentUserRef.current.id);
          }
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

  // Realtime listener para atualizações de subscription (separado para reagir a mudanças no user)
  useEffect(() => {
    if (!user?.id) return;

    const subscriptionChannel = supabase
      .channel(`user-subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[AUTH] Realtime: Subscription atualizada:', payload.eventType);
          // Atualizar dados do usuário quando subscription mudar
          if (currentUserRef.current) {
            fetchUserData(currentUserRef.current as any, false)
              .then(() => {
                // Invalidar cache do React Query
                queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
                queryClient.invalidateQueries({ queryKey: ["subscription"] });
              })
              .catch(console.error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
    };
  }, [user?.id, queryClient]);

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
    // Limpar cache antes de fazer logout
    if (currentUserRef.current) {
      clearUserCache(currentUserRef.current.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    currentUserRef.current = null;
    hasInitialized.current = false;
    lastFetchTime.current = 0;
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message || "Erro ao enviar email de recuperação");
    }
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
              // Log removido para não expor dados sensíveis
              if (import.meta.env.DEV) {
                console.log('[AUTH] refreshSubscription: Subscription atualizada com sucesso');
              }
              
              // Invalidar cache do React Query para forçar atualização em todos os componentes
              queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
              queryClient.invalidateQueries({ queryKey: ["subscription"] });
              
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
        resetPassword,
        refreshSubscription,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
