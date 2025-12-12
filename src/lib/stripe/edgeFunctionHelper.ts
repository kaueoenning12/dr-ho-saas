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

  // NOTA: Secret key NÃO é mais passada do frontend para as edge functions
  // As edge functions buscam a secret_key diretamente do Supabase (tabela stripe_config)
  // A chave do .env é apenas para referência local e não é enviada
  // A Edge Function deve ter a chave configurada na tabela stripe_config do Supabase

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
  
  // Debug: log simplificado (a chave não é mais enviada do frontend)
  if (import.meta.env.DEV) {
    console.log('[Stripe Helper] Chamando Edge Function:', {
      functionName,
      siteUrl: SITE_URL,
      bodyKeys: Object.keys(preparedBody),
      note: 'A secret_key será buscada pela Edge Function na tabela stripe_config',
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
        // Tentar múltiplas formas de extrair o erro
        if (error.context && typeof error.context === 'object') {
          // Se o contexto tem uma resposta, tentar ler o body
          if (error.context instanceof Response) {
            const errorBody = await error.context.clone().text();
            try {
              const errorJson = JSON.parse(errorBody);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
              errorDetails = errorJson;
            } catch {
              errorMessage = errorBody || errorMessage;
            }
          } else if (error.context.body) {
            // Tentar ler do body do contexto
            try {
              const errorJson = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              errorMessage = errorJson.error || errorJson.message || errorMessage;
              errorDetails = errorJson;
            } catch {
              // Ignorar se não conseguir parsear
            }
          }
        }
        
        // Se ainda não temos detalhes, tentar do próprio erro
        if (!errorDetails && error.message) {
          try {
            const parsed = JSON.parse(error.message);
            if (parsed.error || parsed.details) {
              errorMessage = parsed.error || errorMessage;
              errorDetails = parsed;
            }
          } catch {
            // Não é JSON, usar a mensagem como está
          }
        }
      } catch (e) {
        console.warn('[Stripe Helper] Não foi possível extrair detalhes do erro:', e);
      }
      
      // Log detalhado para debug
      console.error('[Stripe Helper] Erro completo da Edge Function:', {
        error,
        errorMessage,
        errorDetails,
        status: error.status,
        context: error.context,
        functionName,
      });

      // Log detalhado do erro (já logado acima, mas manter para compatibilidade)
      console.warn('[Stripe Helper] Erro na Edge Function:', {
        message: errorMessage,
        originalMessage: error.message,
        details: errorDetails,
        status: error.status,
        functionName,
      });

      // Mapear mensagens de erro para português
      let userFriendlyMessage = errorMessage || error.message;
      
      // Erros específicos do Stripe relacionados a Price/Product IDs
      const errorMessageLower = errorMessage?.toLowerCase() || '';
      const errorDetailsLower = errorDetails?.details?.toLowerCase() || '';
      
      if (errorDetails?.stripeErrorCode === 'resource_missing' || 
          errorMessageLower.includes('no such price') ||
          errorMessageLower.includes('price id não encontrado') ||
          errorMessageLower.includes('incompatibilidade entre chave e price')) {
        userFriendlyMessage = errorDetails?.details || errorDetails?.error || 'O Price ID configurado não existe no Stripe ou há incompatibilidade entre a chave e o Price ID. Verifique se o ID está correto e se foi criado no ambiente correto (test/live).';
      } else if (errorDetails?.stripeErrorCode === 'parameter_invalid_empty') {
        userFriendlyMessage = errorDetails.details || 'O Price ID fornecido está vazio ou é inválido. Verifique a configuração do plano.';
      } else if (errorDetails?.stripeErrorCode === 'parameter_invalid_integer') {
        userFriendlyMessage = errorDetails.details || 'Um dos parâmetros enviados ao Stripe é inválido. Verifique a configuração do plano.';
      } else if (errorMessageLower.includes('price id inválido') || errorMessageLower.includes('product id inválido')) {
        userFriendlyMessage = errorDetails?.details || errorMessage || 'O ID do Stripe configurado está em formato inválido.';
      } else if (errorMessageLower.includes('plano não configurado no stripe')) {
        userFriendlyMessage = errorDetails?.details || 'Este plano não possui Price ID do Stripe configurado. Configure o stripe_price_id no plano.';
      } else if (errorDetails?.code === 'ALREADY_SUBSCRIBED') {
        userFriendlyMessage = errorDetails.error || 'Você já possui uma assinatura ativa para este plano. Acesse a página de cobrança para gerenciar sua assinatura.';
      } else if (errorMessageLower.includes('already has an active')) {
        userFriendlyMessage = 'Você já possui uma assinatura ativa. Acesse a página de cobrança para gerenciar sua assinatura.';
      } else if (errorMessageLower.includes('plan not found')) {
        userFriendlyMessage = 'Plano não encontrado ou inativo.';
      } else if (errorMessageLower.includes('user profile not found')) {
        userFriendlyMessage = 'Perfil de usuário não encontrado.';
      } else if (errorMessageLower.includes('stripe secret key')) {
        userFriendlyMessage = 'Erro de configuração do sistema de pagamento. Entre em contato com o suporte.';
      } else if (errorMessageLower.includes('missing required fields')) {
        userFriendlyMessage = 'Dados incompletos. Por favor, tente novamente.';
      } else if (errorMessageLower.includes('erro na requisição ao stripe') || 
                 errorMessageLower.includes('erro na api do stripe') ||
                 errorMessageLower.includes('erro ao criar sessão de checkout') ||
                 errorMessageLower.includes('erro interno do servidor')) {
        // Se temos detalhes, usar eles; caso contrário, tentar extrair mais informações
        if (errorDetails?.details) {
          userFriendlyMessage = errorDetails.details;
        } else if (errorDetails?.error) {
          userFriendlyMessage = errorDetails.error;
        } else {
          userFriendlyMessage = errorMessage || 'Erro ao se comunicar com o Stripe. Verifique a configuração do plano e os logs da Edge Function.';
        }
      } else if (errorMessageLower.includes('test mode') || errorMessageLower.includes('live mode')) {
        userFriendlyMessage = errorDetails?.details || 'Incompatibilidade entre a chave do Stripe e o Price ID. Verifique se ambos são do mesmo ambiente (test ou live).';
      } else if (error.status === 500 || error.status === undefined) {
        // Erro 500 ou sem status - tentar usar detalhes se disponíveis
        if (errorDetails?.details) {
          userFriendlyMessage = errorDetails.details;
        } else if (errorDetails?.error) {
          userFriendlyMessage = errorDetails.error;
        } else {
          userFriendlyMessage = errorMessage || 'Erro interno do servidor. Verifique os logs da Edge Function para mais detalhes.';
        }
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
    
    // Outros erros de rede, etc - não reportar como erro crítico se for erro esperado
    console.warn('[Stripe Helper] Erro ao chamar Edge Function:', error);
    throw new Error(`Erro ao chamar ${functionName}: ${error.message || 'Erro desconhecido'}`);
  }
}

