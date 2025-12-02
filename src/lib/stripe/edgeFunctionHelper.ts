/**
 * Helper para chamar Edge Functions do Stripe passando as chaves do .env
 * Isso permite configurar tudo via .env sem precisar mexer no Supabase
 */

// Lê as variáveis do .env (ou .env.local)
// O Vite expõe variáveis que começam com VITE_ para o frontend
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY || '';
const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

export interface StripeEdgeFunctionRequest {
  [key: string]: any;
  // Chaves do Stripe que serão adicionadas automaticamente
  _stripeSecretKey?: string;
  _siteUrl?: string;
}

/**
 * Adiciona as chaves do Stripe ao body da requisição
 * As Edge Functions irão usar essas chaves se fornecidas, caso contrário usarão Deno.env.get()
 */
export function prepareStripeRequest<T extends Record<string, any>>(
  body: T
): T & { _stripeSecretKey?: string; _siteUrl?: string } {
  const request: T & { _stripeSecretKey?: string; _siteUrl?: string } = {
    ...body,
  };

  // Adiciona as chaves do Stripe se estiverem configuradas no .env
  if (STRIPE_SECRET_KEY) {
    request._stripeSecretKey = STRIPE_SECRET_KEY;
  } else {
    // Debug: avisar se a chave não foi encontrada
    if (import.meta.env.DEV) {
      console.warn('[Stripe Helper] ⚠️ VITE_STRIPE_SECRET_KEY não encontrada no .env');
      console.warn('[Stripe Helper] Verifique se a variável está definida no arquivo .env');
    }
  }

  if (SITE_URL) {
    request._siteUrl = SITE_URL;
  }

  return request;
}

/**
 * Wrapper para chamar Edge Functions do Stripe
 * Automaticamente adiciona as chaves do Stripe ao body
 */
export async function invokeStripeFunction(
  functionName: string,
  body: Record<string, any>
): Promise<any> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const preparedBody = prepareStripeRequest(body);
  
  // Debug: verificar se a chave está sendo lida (não logar a chave completa por segurança)
  if (import.meta.env.DEV) {
    console.log('[Stripe Helper] Chamando Edge Function:', {
      functionName,
      hasStripeKey: !!STRIPE_SECRET_KEY,
      stripeKeyPrefix: STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'missing',
      siteUrl: SITE_URL,
      bodyKeys: Object.keys(preparedBody),
      bodyValues: Object.keys(preparedBody).reduce((acc, key) => {
        acc[key] = key.includes('Secret') || key.includes('Key') 
          ? (preparedBody[key] ? '***hidden***' : 'missing')
          : preparedBody[key];
        return acc;
      }, {} as Record<string, any>),
    });
  }
  
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: preparedBody,
    });

    if (error) {
      // Tentar extrair a mensagem de erro da resposta
      let errorMessage = error.message;
      let errorDetails: any = null;
      
      try {
        if (error.context && typeof error.context === 'object') {
          // Se o contexto tem uma resposta, tentar ler o body
          if (error.context instanceof Response) {
            const errorBody = await error.context.clone().text();
            try {
              const errorJson = JSON.parse(errorBody);
              errorMessage = errorJson.error || errorMessage;
              errorDetails = errorJson;
            } catch {
              errorMessage = errorBody || errorMessage;
            }
          }
        }
      } catch (e) {
        console.warn('[Stripe Helper] Não foi possível extrair detalhes do erro:', e);
      }

      console.error('[Stripe Helper] Erro na Edge Function:', {
        message: errorMessage,
        originalMessage: error.message,
        details: errorDetails,
        status: error.status,
      });

      // Mapear mensagens de erro para português
      let userFriendlyMessage = errorMessage || error.message;
      
      if (errorDetails?.code === 'ALREADY_SUBSCRIBED') {
        userFriendlyMessage = errorDetails.error || 'Você já possui uma assinatura ativa para este plano. Acesse a página de cobrança para gerenciar sua assinatura.';
      } else if (errorMessage?.includes('already has an active')) {
        userFriendlyMessage = 'Você já possui uma assinatura ativa. Acesse a página de cobrança para gerenciar sua assinatura.';
      } else if (errorMessage?.includes('Plan not found')) {
        userFriendlyMessage = 'Plano não encontrado ou inativo.';
      } else if (errorMessage?.includes('User profile not found')) {
        userFriendlyMessage = 'Perfil de usuário não encontrado.';
      } else if (errorMessage?.includes('Stripe secret key')) {
        userFriendlyMessage = 'Erro de configuração do sistema de pagamento. Entre em contato com o suporte.';
      } else if (errorMessage?.includes('Missing required fields')) {
        userFriendlyMessage = 'Dados incompletos. Por favor, tente novamente.';
      }

      const enhancedError = new Error(userFriendlyMessage);
      (enhancedError as any).status = error.status;
      (enhancedError as any).details = errorDetails;
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }

    return data;
  } catch (error: any) {
    // Re-throw se já foi tratado acima
    if (error.originalError) {
      throw error;
    }
    
    // Outros erros de rede, etc
    console.error('[Stripe Helper] Erro ao chamar Edge Function:', error);
    throw new Error(`Erro ao chamar ${functionName}: ${error.message || 'Erro desconhecido'}`);
  }
}

