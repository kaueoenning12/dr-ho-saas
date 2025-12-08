/**
 * Helper para chamar Edge Functions do Stripe
 * As chaves do Stripe agora são gerenciadas via Supabase (tabela stripe_config)
 * Mantém fallback para .env durante transição
 */

// Fallback para .env durante migração (será removido)
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

  // NOTA: Secret key não é mais passada do frontend para as edge functions
  // As edge functions buscam a secret_key diretamente do Supabase (tabela stripe_config)
  // Mantemos fallback para .env apenas durante transição
  // TODO: Remover este fallback após migração completa
  if (STRIPE_SECRET_KEY && import.meta.env.DEV) {
    console.warn('[Stripe Helper] ⚠️ Usando VITE_STRIPE_SECRET_KEY do .env (fallback)');
    console.warn('[Stripe Helper] Configure a secret_key na tabela stripe_config do Supabase');
    // Não passar mais a secret_key do frontend - edge functions buscam do Supabase
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
      
      // Erros específicos do Stripe relacionados a Price/Product IDs
      if (errorDetails?.stripeErrorCode === 'resource_missing') {
        userFriendlyMessage = errorDetails.details || 'O Price ID configurado não existe no Stripe. Verifique se o ID está correto e se foi criado no ambiente correto (test/live).';
      } else if (errorDetails?.stripeErrorCode === 'parameter_invalid_empty') {
        userFriendlyMessage = errorDetails.details || 'O Price ID fornecido está vazio ou é inválido. Verifique a configuração do plano.';
      } else if (errorDetails?.stripeErrorCode === 'parameter_invalid_integer') {
        userFriendlyMessage = errorDetails.details || 'Um dos parâmetros enviados ao Stripe é inválido. Verifique a configuração do plano.';
      } else if (errorMessage?.includes('Price ID inválido') || errorMessage?.includes('Product ID inválido')) {
        userFriendlyMessage = errorDetails?.details || errorMessage || 'O ID do Stripe configurado está em formato inválido.';
      } else if (errorMessage?.includes('Plano não configurado no Stripe')) {
        userFriendlyMessage = errorDetails?.details || 'Este plano não possui Price ID do Stripe configurado. Configure o stripe_price_id no plano.';
      } else if (errorDetails?.code === 'ALREADY_SUBSCRIBED') {
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
      } else if (errorMessage?.includes('Erro na requisição ao Stripe') || errorMessage?.includes('Erro na API do Stripe')) {
        userFriendlyMessage = errorDetails?.details || errorMessage || 'Erro ao se comunicar com o Stripe. Verifique a configuração do plano.';
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

