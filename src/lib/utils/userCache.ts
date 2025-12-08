// Cache persistente para dados do usuário
const CACHE_KEY_PREFIX = 'dr_ho_user_cache_';
const CACHE_VERSION = '1';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos

interface CachedUserData {
  version: string;
  timestamp: number;
  userId: string;
  profile: any;
  role: string;
  subscription: any;
}

export function getUserCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

export function saveUserDataToCache(userId: string, data: {
  profile: any;
  role: string;
  subscription: any;
}): void {
  try {
    const cacheData: CachedUserData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      userId,
      profile: data.profile,
      role: data.role,
      subscription: data.subscription,
    };
    localStorage.setItem(getUserCacheKey(userId), JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[UserCache] Erro ao salvar cache:', error);
  }
}

export function getUserDataFromCache(userId: string): {
  profile: any;
  role: string;
  subscription: any;
} | null {
  try {
    const cached = localStorage.getItem(getUserCacheKey(userId));
    if (!cached) return null;

    const cacheData: CachedUserData = JSON.parse(cached);
    
    // Verificar versão do cache
    if (cacheData.version !== CACHE_VERSION) {
      clearUserCache(userId);
      return null;
    }

    // Verificar se expirou
    const age = Date.now() - cacheData.timestamp;
    if (age > CACHE_EXPIRY_MS) {
      clearUserCache(userId);
      return null;
    }

    // Verificar se é do mesmo usuário
    if (cacheData.userId !== userId) {
      clearUserCache(userId);
      return null;
    }

    return {
      profile: cacheData.profile,
      role: cacheData.role,
      subscription: cacheData.subscription,
    };
  } catch (error) {
    console.warn('[UserCache] Erro ao ler cache:', error);
    return null;
  }
}

export function clearUserCache(userId: string): void {
  try {
    localStorage.removeItem(getUserCacheKey(userId));
  } catch (error) {
    console.warn('[UserCache] Erro ao limpar cache:', error);
  }
}

export function clearAllUserCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[UserCache] Erro ao limpar todos os caches:', error);
  }
}

/**
 * Tenta encontrar o último userId usado no cache
 * Útil para carregar cache síncronamente antes de getSession()
 */
export function getLastCachedUserId(): string | null {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const cacheData: CachedUserData = JSON.parse(cached);
          // Verificar se o cache ainda é válido
          const age = Date.now() - cacheData.timestamp;
          if (age <= CACHE_EXPIRY_MS && cacheData.version === CACHE_VERSION) {
            return cacheData.userId;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[UserCache] Erro ao buscar último userId:', error);
  }
  return null;
}

/**
 * Carrega dados do cache síncronamente para um userId
 * Retorna null se não encontrar cache válido
 */
export function loadUserDataFromCacheSync(userId: string | null): {
  user: any;
  profile: any;
} | null {
  if (!userId) return null;
  
  const cachedData = getUserDataFromCache(userId);
  if (!cachedData) return null;

  return {
    user: {
      id: userId,
      email: cachedData.profile?.email || "",
      name: cachedData.profile?.name || "Usuário",
      role: cachedData.role || "user",
      number: cachedData.profile?.number || null,
      avatarUrl: cachedData.profile?.avatar_url || null,
      subscription: cachedData.subscription || null,
    },
    profile: cachedData.profile,
  };
}

