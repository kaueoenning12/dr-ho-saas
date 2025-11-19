import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://jjkptijbjyxbrgbxwgxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa3B0aWpianl4YnJnYnh3Z3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTUwNjYsImV4cCI6MjA3NjAzMTA2Nn0.S0zxO5aV1WQ1X4uolvNn-ssu_Ic35Rth6kVw_PxfbmM";

/**
 * Cria um cliente Supabase com token explícito
 * Isso garante que o token está sendo enviado corretamente
 */
export async function createSupabaseClientWithToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Token de autenticação não encontrado');
  }

  console.log('[Storage Helper] Criando cliente com token explícito:', {
    tokenPreview: `${session.access_token.substring(0, 20)}...`,
    tokenLength: session.access_token.length,
  });

  // Criar novo cliente com o token explicitamente
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  // Definir a sessão explicitamente
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token || '',
  });

  return client;
}

/**
 * Upload usando fetch direto com headers explícitos
 * Bypass do cliente Supabase para isolar problemas
 */
export async function uploadWithFetchDirect(
  file: File,
  storagePath: string,
  bucket: string = 'documents'
): Promise<{ publicUrl: string; filePath: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Token de autenticação não encontrado');
  }

  if (sessionError) {
    throw new Error(`Erro ao obter sessão: ${sessionError.message}`);
  }

  // Construir URL do Supabase Storage API
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
  
  console.log('[Storage Helper] Upload com fetch direto:', {
    url,
    storagePath,
    fileSize: file.size,
    contentType: file.type,
    tokenPreview: `${session.access_token.substring(0, 20)}...`,
  });

  // Fazer requisição com headers explícitos e retry
  let lastError: Error | null = null;
  let retries = 3;
  let currentToken = session.access_token;
  
  while (retries > 0) {
    try {
      // Recriar FormData a cada tentativa (não pode ser reutilizado)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'x-upsert': 'false',
          'Cache-Control': 'no-cache',
        },
        body: formData,
      });

      // Logar resposta completa para debug
      console.log(`[Storage Helper] Resposta do fetch (tentativa ${4 - retries}):`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Storage Helper] ✅ Upload bem-sucedido com fetch direto:', result);

        // Construir URL pública
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;

        return {
          publicUrl,
          filePath: storagePath,
        };
      }

      // Se não for OK, ler erro
      const errorText = await response.text();
      lastError = new Error(`Upload falhou: ${response.status} ${response.statusText}. ${errorText}`);
      
      // Se for erro 403/401, tentar refresh do token
      if ((response.status === 403 || response.status === 401) && retries > 1) {
        console.log('[Storage Helper] Token pode ter expirado, tentando refresh...');
        const { data: { session: newSession } } = await supabase.auth.refreshSession();
        if (newSession?.access_token) {
          // Atualizar token e tentar novamente
          currentToken = newSession.access_token;
          retries--;
          continue;
        }
      }

      // Se for erro de acesso negado, não adianta tentar novamente
      if (response.status === 403) {
        throw new Error(`Acesso negado (403). RLS pode estar bloqueando. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor. Detalhes: ${errorText}`);
      }

      retries--;
      if (retries > 0) {
        console.warn(`[Storage Helper] Tentativa falhou, tentando novamente... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s antes de retry
      }
    } catch (error: any) {
      lastError = error;
      retries--;
      if (retries > 0) {
        console.warn(`[Storage Helper] Erro na tentativa, tentando novamente... (${retries} tentativas restantes):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error('[Storage Helper] ❌ Todas as tentativas de upload falharam:', lastError);
  
  if (lastError) {
    throw lastError;
  }
  
  throw new Error('Upload falhou após múltiplas tentativas');
}

/**
 * Intercepta requisições para debug
 * Adiciona logs detalhados dos headers e respostas
 */
export function setupRequestInterception() {
  if (typeof window === 'undefined') return;

  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Só interceptar requisições para Supabase Storage
    if (typeof url === 'string' && url.includes('/storage/v1/object/')) {
      console.log('[Request Interception] Requisição interceptada:', {
        url,
        method: options?.method || 'GET',
        headers: options?.headers,
        hasBody: !!options?.body,
      });

      try {
        const response = await originalFetch.apply(this, args);
        
        // Clonar resposta para ler sem consumir
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        
        console.log('[Request Interception] Resposta:', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText.substring(0, 500), // Primeiros 500 chars
        });

        // Retornar resposta original
        return response;
      } catch (error) {
        console.error('[Request Interception] Erro na requisição:', {
          url,
          error,
        });
        throw error;
      }
    }

    return originalFetch.apply(this, args);
  };
}

/**
 * Upload usando Edge Function (última alternativa)
 * A Edge Function usa service role key e bypassa RLS completamente
 */
export async function uploadWithEdgeFunction(
  file: File,
  storagePath: string
): Promise<{ publicUrl: string; filePath: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Token de autenticação não encontrado');
  }

  if (sessionError) {
    throw new Error(`Erro ao obter sessão: ${sessionError.message}`);
  }

  console.log('[Storage Helper] Upload com Edge Function:', {
    storagePath,
    fileSize: file.size,
    contentType: file.type,
  });

  // Preparar FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', storagePath);

  // Chamar Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('upload-document', {
      body: formData,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      // Se for erro de CORS ou função não encontrada, tentar chamar diretamente via fetch
      if (error.message?.includes('CORS') || error.message?.includes('Failed to send')) {
        console.warn('[Storage Helper] Erro de CORS na Edge Function, tentando chamada direta via fetch');
        return await uploadWithEdgeFunctionDirect(file, storagePath, session.access_token);
      }
      console.error('[Storage Helper] Erro na Edge Function:', error);
      throw new Error(`Upload falhou via Edge Function: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(`Upload falhou: ${data?.error || 'Erro desconhecido'}`);
    }

    console.log('[Storage Helper] ✅ Upload bem-sucedido via Edge Function:', data);

    return {
      publicUrl: data.publicUrl,
      filePath: storagePath,
    };
  } catch (error: any) {
    // Se falhar, tentar chamada direta
    if (error.message?.includes('CORS') || error.message?.includes('Failed to send')) {
      console.warn('[Storage Helper] Erro ao chamar Edge Function, tentando chamada direta via fetch');
      return await uploadWithEdgeFunctionDirect(file, storagePath, session.access_token);
    }
    throw error;
  }
}

/**
 * Upload usando Edge Function via fetch direto (bypass do cliente Supabase)
 * Útil quando há problemas de CORS
 */
async function uploadWithEdgeFunctionDirect(
  file: File,
  storagePath: string,
  accessToken: string
): Promise<{ publicUrl: string; filePath: string }> {
  const SUPABASE_URL = "https://jjkptijbjyxbrgbxwgxf.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa3B0aWpianl4YnJnYnh3Z3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTUwNjYsImV4cCI6MjA3NjAzMTA2Nn0.S0zxO5aV1WQ1X4uolvNn-ssu_Ic35Rth6kVw_PxfbmM";

  console.log('[Storage Helper] Upload com Edge Function via fetch direto:', {
    storagePath,
    fileSize: file.size,
  });

  // Preparar FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', storagePath);

  // Chamar Edge Function diretamente via fetch
  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Storage Helper] Erro na Edge Function (fetch direto):', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Upload falhou: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  
  if (!data?.success) {
    throw new Error(`Upload falhou: ${data?.error || 'Erro desconhecido'}`);
  }

  console.log('[Storage Helper] ✅ Upload bem-sucedido via Edge Function (fetch direto):', data);

  return {
    publicUrl: data.publicUrl,
    filePath: storagePath,
  };
}

