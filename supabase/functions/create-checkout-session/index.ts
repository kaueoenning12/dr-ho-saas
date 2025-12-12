import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log('[Checkout Session] ========================================');
  console.log('[Checkout Session] 🚀 NOVA REQUISIÇÃO INICIADA:', {
    requestId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    headers: {
      'content-type': req.headers.get('content-type'),
      'authorization': req.headers.get('authorization') ? 'present' : 'missing',
      'origin': req.headers.get('origin'),
    },
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[Checkout Session] ✅ CORS preflight request - retornando OK');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    let body;
    let bodyText: string | undefined;
    const bodyStartTime = Date.now();
    try {
      bodyText = await req.text();
      console.log('[Checkout Session] 📥 Body recebido (raw):', {
        requestId,
        bodyLength: bodyText?.length || 0,
        bodyPreview: bodyText ? bodyText.substring(0, 200) : 'empty',
        parseTime: Date.now() - bodyStartTime + 'ms',
      });
      
      if (!bodyText) {
        throw new Error('Body está vazio');
      }
      
      body = JSON.parse(bodyText);
      console.log('[Checkout Session] ✅ Body parseado com sucesso:', {
        requestId,
        bodyKeys: Object.keys(body),
        hasPlanId: !!body.planId,
        hasUserId: !!body.userId,
        parseTime: Date.now() - bodyStartTime + 'ms',
      });
    } catch (parseError) {
      console.error('[Checkout Session] ❌ Erro ao parsear body:', {
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined,
        bodyPreview: bodyText ? bodyText.substring(0, 200) : 'undefined',
        parseTime: Date.now() - bodyStartTime + 'ms',
      });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : String(parseError),
          requestId,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { planId, userId, successUrl, cancelUrl, _stripeSecretKey, _siteUrl } = body

    // Debug: log do que foi recebido (sem expor a chave completa)
    console.log('[Checkout Session] 📋 Parâmetros extraídos do body:', {
      requestId,
      planId: planId || 'MISSING',
      userId: userId || 'MISSING',
      planIdType: typeof planId,
      userIdType: typeof userId,
      planIdLength: planId ? String(planId).length : 0,
      userIdLength: userId ? String(userId).length : 0,
      hasStripeKey: !!_stripeSecretKey,
      stripeKeyPrefix: _stripeSecretKey ? _stripeSecretKey.substring(0, 12) + '...' : 'missing',
      siteUrl: _siteUrl || 'not provided',
      successUrl: successUrl || 'not provided',
      cancelUrl: cancelUrl || 'not provided',
      totalTime: Date.now() - startTime + 'ms',
    })

    // Validar campos obrigatórios primeiro
    if (!planId || !userId) {
      console.error('[Checkout Session] Campos obrigatórios faltando:', { planId, userId })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: planId, userId',
          received: { hasPlanId: !!planId, hasUserId: !!userId }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client first (needed to fetch Stripe config)
    const supabaseInitStart = Date.now();
    console.log('[Checkout Session] 🔧 Inicializando cliente Supabase...', {
      requestId,
      step: 'supabase_init',
    });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Checkout Session] ❌ Variáveis de ambiente do Supabase não configuradas:', {
        requestId,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
        serviceKeyPreview: supabaseServiceKey ? supabaseServiceKey.substring(0, 12) + '...' : 'missing',
        totalTime: Date.now() - startTime + 'ms',
      });
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do servidor incompleta',
          details: 'Variáveis de ambiente do Supabase não configuradas',
          requestId,
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('[Checkout Session] ✅ Cliente Supabase inicializado:', {
      requestId,
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      initTime: Date.now() - supabaseInitStart + 'ms',
      totalTime: Date.now() - startTime + 'ms',
    });

    // Get Stripe secret key from Supabase (stripe_config table)
    // Fallback to request body or Deno.env for backward compatibility
    const configFetchStart = Date.now();
    console.log('[Checkout Session] 🔍 Buscando configuração do Stripe no banco...', {
      requestId,
      step: 'fetch_stripe_config',
    });
    
    let stripeSecretKey = '';
    let siteUrl = _siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:8080';
    let stripeConfig: any = null;
    let configError: any = null;
    
    console.log('[Checkout Session] 📍 Site URL determinado:', {
      requestId,
      siteUrl,
      source: _siteUrl ? 'request body' : Deno.env.get('SITE_URL') ? 'Deno.env' : 'default',
    });

    try {
      // Try to get active Stripe config from Supabase
      console.log('[Checkout Session] 🔍 Iniciando busca de configuração no banco...', {
        requestId,
        step: 'fetch_config_start',
        timestamp: new Date().toISOString(),
      });
      
      const result = await supabase
        .from('stripe_config')
        .select('secret_key, default_product_id, default_price_id, environment, publishable_key, is_active')
        .eq('is_active', true)
        .maybeSingle();
      
      stripeConfig = result.data;
      configError = result.error;
      
      console.log('[Checkout Session] 📊 Resultado da busca de configuração:', {
        requestId,
        hasConfig: !!stripeConfig,
        hasError: !!configError,
        errorCode: configError?.code,
        errorMessage: configError?.message,
        errorDetails: configError?.details,
        errorHint: configError?.hint,
        configId: stripeConfig?.id || 'N/A',
        configEnvironment: stripeConfig?.environment || 'N/A',
        configIsActive: stripeConfig?.is_active,
        hasSecretKey: !!stripeConfig?.secret_key,
        secretKeyPrefix: stripeConfig?.secret_key ? stripeConfig.secret_key.substring(0, 20) + '...' : 'N/A',
        secretKeyType: stripeConfig?.secret_key ? 
          (stripeConfig.secret_key.startsWith('sk_live_') ? 'PRODUÇÃO' : 
           stripeConfig.secret_key.startsWith('sk_test_') ? 'TESTE' : 
           'DESCONHECIDO') : 
          'N/A',
        hasDefaultProductId: !!stripeConfig?.default_product_id,
        hasDefaultPriceId: !!stripeConfig?.default_price_id,
        hasPublishableKey: !!stripeConfig?.publishable_key,
        fetchTime: Date.now() - configFetchStart + 'ms',
        totalTime: Date.now() - startTime + 'ms',
        // Verificar também se há variável de ambiente configurada
        hasEnvSecretKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
        envSecretKeyPrefix: Deno.env.get('STRIPE_SECRET_KEY') ? 
          Deno.env.get('STRIPE_SECRET_KEY')!.substring(0, 20) + '...' : 
          'N/A',
        envSecretKeyType: Deno.env.get('STRIPE_SECRET_KEY') ? 
          (Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_live_') ? 'PRODUÇÃO' : 
           Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_test_') ? 'TESTE' : 
           'DESCONHECIDO') : 
          'N/A',
        warning: Deno.env.get('STRIPE_SECRET_KEY') && stripeConfig?.secret_key ? 
          '⚠️ ATENÇÃO: Há chave no banco E na variável de ambiente. A do banco será usada.' : 
          null,
      });

      if (configError) {
        console.error('[Checkout Session] ❌ Erro ao buscar config do Supabase:', {
          error: configError,
          code: configError.code,
          message: configError.message,
          details: configError.details,
        });
      }

      if (!configError && stripeConfig?.secret_key) {
        stripeSecretKey = stripeConfig.secret_key;
        const keyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
        console.log('[Checkout Session] ✅ Usando secret_key do Supabase (stripe_config):', {
          requestId,
          source: 'Banco de Dados (stripe_config)',
          hasSecretKey: !!stripeSecretKey,
          secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 20) + '...' : 'missing',
          secretKeyLength: stripeSecretKey?.length || 0,
          secretKeyType: keyType,
          environment: stripeConfig.environment || 'N/A',
          configId: stripeConfig.id || 'N/A',
          hasDefaultProductId: !!stripeConfig.default_product_id,
          defaultProductId: stripeConfig.default_product_id || 'N/A',
          hasDefaultPriceId: !!stripeConfig.default_price_id,
          defaultPriceId: stripeConfig.default_price_id || 'N/A',
          warning: keyType === 'UNKNOWN' ? 'Formato de chave desconhecido - deve começar com sk_live_ ou sk_test_' : null,
          fetchTime: Date.now() - configFetchStart + 'ms',
          totalTime: Date.now() - startTime + 'ms',
          // Mostrar também a chave do env para comparação
          envSecretKeyExists: !!Deno.env.get('STRIPE_SECRET_KEY'),
          envSecretKeyType: Deno.env.get('STRIPE_SECRET_KEY') ? 
            (Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_live_') ? 'PRODUCTION' : 
             Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_test_') ? 'TEST' : 
             'UNKNOWN') : 
            'N/A',
          note: 'A chave do banco de dados tem prioridade ABSOLUTA. Variáveis de ambiente são IGNORADAS.',
        });
      } else {
        // IMPORTANTE: NÃO usar fallback de variável de ambiente para evitar incompatibilidade
        // Apenas usar chave do request body em último caso (para depuração)
        console.error('[Checkout Session] ❌ Nenhuma secret_key encontrada no banco de dados:', {
          requestId,
          configError: configError ? {
            code: configError.code,
            message: configError.message,
            details: configError.details,
            hint: configError.hint,
          } : null,
          hasConfigInDb: !!stripeConfig,
          configHasSecretKey: !!stripeConfig?.secret_key,
          hasEnvSecretKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
          envSecretKeyType: Deno.env.get('STRIPE_SECRET_KEY') ? 
            (Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_live_') ? 'PRODUCTION' : 
             Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_test_') ? 'TEST' : 
             'UNKNOWN') : 
            'N/A',
          warning: '⚠️ IMPORTANTE: Variáveis de ambiente são IGNORADAS para evitar incompatibilidade. Configure a chave no banco de dados.',
          suggestion: 'Verifique se existe um registro na tabela stripe_config com is_active = true e secret_key preenchida com a chave CORRETA (sk_live_ para produção)',
        });
        
        // NÃO fazer fallback para Deno.env.get('STRIPE_SECRET_KEY')
        // Isso evita o erro de incompatibilidade test/live
        stripeSecretKey = '';
      }
    } catch (error) {
      console.error('[Checkout Session] ❌ Erro ao buscar config do Supabase:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        suggestion: 'Configure a secret_key na tabela stripe_config do Supabase',
      });
      // NÃO fazer fallback para variável de ambiente
      stripeSecretKey = '';
    }

    if (!stripeSecretKey) {
      console.error('[Checkout Session] ❌ Stripe secret key não configurada:', {
        requestId,
        hasStripeConfig: !!stripeConfig,
        hasSecretKeyInConfig: !!stripeConfig?.secret_key,
        hasStripeKeyInEnv: !!Deno.env.get('STRIPE_SECRET_KEY'),
        hasStripeKeyInBody: !!_stripeSecretKey,
        configError: configError ? {
          code: configError.code,
          message: configError.message,
          details: configError.details,
        } : null,
        totalTime: Date.now() - startTime + 'ms',
      });
      return new Response(
        JSON.stringify({ 
          error: 'Stripe secret key not configured',
          details: 'Configure a secret_key na tabela stripe_config do Supabase ou use variável de ambiente STRIPE_SECRET_KEY',
          requestId,
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Log final da chave que será usada
    const finalSecretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : 
                               stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 
                               'UNKNOWN';
    const finalSecretKeySource = stripeConfig?.secret_key === stripeSecretKey ? 'Banco de Dados (stripe_config)' :
                                 Deno.env.get('STRIPE_SECRET_KEY') === stripeSecretKey ? 'Variável de Ambiente (Deno.env)' :
                                 _stripeSecretKey === stripeSecretKey ? 'Request Body' :
                                 'DESCONHECIDO';
    
    console.log('[Checkout Session] 🔧 CHAVE FINAL QUE SERÁ USADA:', {
      requestId,
      secretKeySource: finalSecretKeySource,
      secretKeyType: finalSecretKeyType,
      secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 20) + '...' : 'NÃO CONFIGURADO',
      secretKeyLength: stripeSecretKey?.length || 0,
      siteUrl: siteUrl,
      hasConfigInDb: !!stripeConfig,
      configSecretKeyType: stripeConfig?.secret_key ? 
        (stripeConfig.secret_key.startsWith('sk_live_') ? 'PRODUCTION' : 
         stripeConfig.secret_key.startsWith('sk_test_') ? 'TEST' : 
         'UNKNOWN') : 
        'N/A',
      envSecretKeyType: Deno.env.get('STRIPE_SECRET_KEY') ? 
        (Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_live_') ? 'PRODUCTION' : 
         Deno.env.get('STRIPE_SECRET_KEY')!.startsWith('sk_test_') ? 'TEST' : 
         'UNKNOWN') : 
        'N/A',
      warning: finalSecretKeySource.includes('Deno.env') ? 
        '⚠️ ATENÇÃO: Usando variável de ambiente! Isso pode causar incompatibilidade. Configure no banco de dados.' : 
        null,
    });

    // Initialize Stripe
    const stripeInitStart = Date.now();
    console.log('[Checkout Session] 🔧 Inicializando cliente Stripe...', {
      requestId,
      step: 'stripe_init',
      secretKeyType: stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN',
      secretKeyPrefix: stripeSecretKey.substring(0, 12) + '...',
    });
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
    
    console.log('[Checkout Session] ✅ Cliente Stripe inicializado:', {
      requestId,
      initTime: Date.now() - stripeInitStart + 'ms',
      totalTime: Date.now() - startTime + 'ms',
    });

    // Get the subscription plan - FORÇAR BUSCA SEM CACHE
    console.log('[Checkout Session] 🔍 Buscando plano no banco de dados:', {
      planId: planId,
      timestamp: new Date().toISOString(),
    });
    
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      console.error('[Checkout Session] ❌ Erro ao buscar plano:', {
        requestId,
        planId: planId,
        planIdType: typeof planId,
        error: planError ? {
          code: planError.code,
          message: planError.message,
          details: planError.details,
          hint: planError.hint,
        } : null,
        planFound: !!plan,
        planData: plan ? {
          id: plan.id,
          name: plan.name,
          is_active: plan.is_active,
        } : null,
        fetchTime: Date.now() - Date.now() + 'ms', // Will be calculated properly
        totalTime: Date.now() - startTime + 'ms',
      });
      return new Response(
        JSON.stringify({ 
          error: 'Plan not found or inactive',
          details: planError?.message || 'Plano não encontrado ou inativo',
          requestId,
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log completo do plano retornado do banco
    console.log('[Checkout Session] 📦 Plano retornado do banco de dados:', {
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      stripe_price_id: plan.stripe_price_id || 'NULL/Vazio',
      stripe_product_id: plan.stripe_product_id || 'NULL/Vazio',
      stripe_price_id_type: typeof plan.stripe_price_id,
      stripe_price_id_length: plan.stripe_price_id?.length || 0,
      stripe_product_id_type: typeof plan.stripe_product_id,
      stripe_product_id_length: plan.stripe_product_id?.length || 0,
      is_active: plan.is_active,
      updated_at: plan.updated_at,
      timestamp: new Date().toISOString(),
    });

    // Validação: Bloquear checkout de planos gratuitos
    if (plan.price <= 0) {
      console.error('[Checkout Session] ❌ Tentativa de checkout para plano gratuito:', {
        planId: plan.id,
        planName: plan.name,
        price: plan.price
      });
      return new Response(
        JSON.stringify({ 
          error: 'Planos gratuitos não podem ser processados pelo Stripe',
          details: 'Não é possível criar checkout para planos com valor R$ 0,00. Planos gratuitos são atribuídos automaticamente.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validação: Verificar se o plano tem Price ID do Stripe configurado
    // Product ID pode ser do plano ou usar o default_product_id da configuração
    const priceId = plan.stripe_price_id;
    const planProductId = plan.stripe_product_id;
    
    console.log('[Checkout Session] 📋 Validação de IDs do Stripe (valores RAW do banco):', {
      planId: plan.id,
      planName: plan.name,
      priceId_RAW: priceId,
      priceId_STRINGIFIED: JSON.stringify(priceId),
      planProductId_RAW: planProductId,
      planProductId_STRINGIFIED: JSON.stringify(planProductId),
      priceIdType: typeof priceId,
      priceIdLength: priceId?.length || 0,
      priceIdIsNull: priceId === null,
      priceIdIsUndefined: priceId === undefined,
      priceIdIsEmptyString: priceId === '',
      planProductIdType: typeof planProductId,
      planProductIdLength: planProductId?.length || 0,
      planProductIdIsNull: planProductId === null,
      planProductIdIsUndefined: planProductId === undefined,
      planProductIdIsEmptyString: planProductId === '',
    });

    // Validar formato do price_id se existir
    if (priceId && typeof priceId === 'string') {
      const priceIdTrimmed = priceId.trim();
      if (!priceIdTrimmed.startsWith('price_')) {
        console.error('[Checkout Session] ❌ Price ID com formato inválido:', {
          priceId: priceIdTrimmed,
          expectedFormat: 'price_xxxxx',
        });
        return new Response(
          JSON.stringify({ 
            error: 'Price ID inválido',
            details: `O Price ID configurado não está no formato correto. Deve começar com "price_". Valor recebido: ${priceIdTrimmed.substring(0, 20)}...`
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Validar formato do product_id do plano se existir
    if (planProductId && typeof planProductId === 'string') {
      const productIdTrimmed = planProductId.trim();
      if (!productIdTrimmed.startsWith('prod_')) {
        console.error('[Checkout Session] ❌ Product ID do plano com formato inválido:', {
          productId: productIdTrimmed,
          expectedFormat: 'prod_xxxxx',
        });
        return new Response(
          JSON.stringify({ 
            error: 'Product ID inválido',
            details: `O Product ID configurado no plano não está no formato correto. Deve começar com "prod_". Valor recebido: ${productIdTrimmed.substring(0, 20)}...`
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (!priceId || (typeof priceId === 'string' && priceId.trim() === '')) {
      console.error('[Checkout Session] ❌ Plano sem Price ID do Stripe configurado:', {
        planId: plan.id,
        planName: plan.name,
        hasProductId: !!planProductId,
        hasPriceId: false,
        priceIdValue: priceId,
      });
      return new Response(
        JSON.stringify({ 
          error: 'Plano não configurado no Stripe',
          details: 'Este plano não possui Price ID do Stripe configurado. Configure o stripe_price_id no plano ou entre em contato com o suporte.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Se o plano não tem product_id, tentar usar o default_product_id da configuração
    let productId = planProductId?.trim() || null;
    if (!productId) {
      try {
        const { data: stripeConfig } = await supabase
          .from('stripe_config')
          .select('default_product_id')
          .eq('is_active', true)
          .maybeSingle();
        
        if (stripeConfig?.default_product_id) {
          const defaultProductId = stripeConfig.default_product_id.trim();
          if (defaultProductId.startsWith('prod_')) {
            productId = defaultProductId;
            console.log('[Checkout Session] ✅ Usando default_product_id da configuração:', productId);
          } else {
            console.warn('[Checkout Session] ⚠️ default_product_id da configuração tem formato inválido:', {
              defaultProductId: defaultProductId.substring(0, 20) + '...',
              expectedFormat: 'prod_xxxxx',
            });
          }
        }
      } catch (error) {
        console.warn('[Checkout Session] Erro ao buscar default_product_id:', error);
      }
    }

    // Log dos IDs que serão usados - ANTES E DEPOIS DO TRIM
    const finalPriceId = typeof priceId === 'string' ? priceId.trim() : '';
    
    // Verificar compatibilidade entre chave e Price ID
    const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
    const priceIdType = finalPriceId.startsWith('price_') ? 
      (finalPriceId.includes('_test_') || finalPriceId.length < 30 ? 'TEST' : 'PRODUCTION') : 'UNKNOWN';
    
    console.log('[Checkout Session] ✅ IDs validados e que serão usados no checkout:', {
      priceId_ANTES_TRIM: priceId,
      priceId_DEPOIS_TRIM: finalPriceId,
      priceId_LENGTH: finalPriceId.length,
      productId: productId || 'NÃO CONFIGURADO (Stripe usará o product do price)',
      planId: plan.id,
      planName: plan.name,
      secretKeyType: secretKeyType,
      priceIdType: priceIdType,
      compatibility: secretKeyType === priceIdType ? '✅ COMPATÍVEL' : '❌ INCOMPATÍVEL',
      warning: secretKeyType !== priceIdType && secretKeyType !== 'UNKNOWN' && priceIdType !== 'UNKNOWN' 
        ? `ATENÇÃO: Chave é ${secretKeyType} mas Price ID parece ser ${priceIdType}. Isso causará erro no Stripe!`
        : null,
      timestamp: new Date().toISOString(),
    });
    
    // Validar compatibilidade antes de prosseguir
    if (secretKeyType !== 'UNKNOWN' && priceIdType !== 'UNKNOWN' && secretKeyType !== priceIdType) {
      console.error('[Checkout Session] ❌ INCOMPATIBILIDADE DETECTADA:', {
        secretKeyType,
        priceIdType,
        priceId: finalPriceId,
        message: 'A chave secreta e o Price ID devem ser do mesmo ambiente (test ou production)',
      });
      return new Response(
        JSON.stringify({ 
          error: 'Incompatibilidade entre chave e Price ID',
          details: `A chave secreta configurada é de ${secretKeyType === 'PRODUCTION' ? 'PRODUÇÃO' : 'TESTE'}, mas o Price ID parece ser de ${priceIdType === 'PRODUCTION' ? 'PRODUÇÃO' : 'TESTE'}. Ambos devem ser do mesmo ambiente. Verifique a configuração na tabela stripe_config e no plano.`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Verificar se o price_id mudou após trim
    if (typeof priceId === 'string' && priceId !== finalPriceId) {
      console.warn('[Checkout Session] ⚠️ Price ID tinha espaços e foi trimado:', {
        original: priceId,
        trimmed: finalPriceId,
      });
    }

    // Garantir que priceId está validado e no formato correto
    const validatedPriceId = typeof priceId === 'string' ? priceId.trim() : '';
    
    console.log('[Checkout Session] 🔍 Validação final do Price ID:', {
      priceId_DO_BANCO: priceId,
      priceId_APOS_TRIM: validatedPriceId,
      priceId_STARTS_WITH_PRICE: validatedPriceId.startsWith('price_'),
      priceId_LENGTH: validatedPriceId.length,
      priceId_IS_EMPTY: validatedPriceId === '',
      priceId_IS_NULL: priceId === null,
    });
    
    if (!validatedPriceId || !validatedPriceId.startsWith('price_')) {
      console.error('[Checkout Session] ❌ Price ID não passou na validação final:', {
        priceId_DO_BANCO: priceId,
        priceId_APOS_TRIM: validatedPriceId,
        originalPriceId: priceId,
        priceIdType: typeof priceId,
        priceIdValue: JSON.stringify(priceId),
      });
      return new Response(
        JSON.stringify({ 
          error: 'Price ID inválido',
          details: `O Price ID não está no formato correto. Deve começar com "price_". Valor recebido do banco: ${priceId === null ? 'NULL' : priceId === undefined ? 'UNDEFINED' : priceId === '' ? 'VAZIO' : JSON.stringify(priceId)}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[Checkout Session] ✅ Plano validado e pronto para checkout:', {
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      priceId_FINAL: validatedPriceId,
      productId: productId || 'N/A',
      hasValidPriceId: true,
      hasProductId: !!productId,
      timestamp: new Date().toISOString(),
    });
    
    // Verificar se o price existe no Stripe ANTES de criar a sessão
    // Isso evita erros mais tarde e dá mensagens mais claras
    try {
      console.log('[Checkout Session] 🔍 Verificando se Price ID existe no Stripe...', {
        priceId: validatedPriceId,
        priceIdLength: validatedPriceId.length,
        secretKeyType: stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN',
      });
      const priceObj = await stripe.prices.retrieve(validatedPriceId);
      
      console.log('[Checkout Session] ✅ Price ID existe no Stripe:', {
        priceId: validatedPriceId,
        priceActive: priceObj.active,
        priceType: priceObj.type,
        priceAmount: priceObj.unit_amount,
        priceCurrency: priceObj.currency,
        priceProductId: priceObj.product,
      });
      
      // Verificar se o price está ativo
      if (!priceObj.active) {
        console.warn('[Checkout Session] ⚠️ AVISO: Price ID existe mas está INATIVO no Stripe');
      }
      
      // Verificar compatibilidade do product se fornecido
      if (productId) {
        const priceProductId = priceObj.product as string;
        console.log('[Checkout Session] 📊 Validação Price x Product:', {
          priceId: validatedPriceId,
          priceProductId_doStripe: priceProductId,
          productId_doPlano: productId,
          products_combinam: priceProductId === productId,
        });
        
        if (priceProductId !== productId) {
          console.warn('[Checkout Session] ⚠️ AVISO: Price ID não pertence ao Product ID configurado:', {
            priceId: validatedPriceId,
            productId_doPrice_noStripe: priceProductId,
            productId_configurado_noPlano: productId,
            mensagem: 'O Stripe usará o product do price, não o configurado no plano',
          });
        } else {
          console.log('[Checkout Session] ✅ Price ID pertence ao Product ID configurado');
        }
      }
    } catch (priceCheckError: any) {
      // Extrair mensagem de erro completa
      const fullErrorMessage = priceCheckError?.message || 
                               priceCheckError?.raw?.message || 
                               priceCheckError?.raw?.error?.message ||
                               JSON.stringify(priceCheckError) ||
                               'Unknown error';
      
      // Verificar se é erro de "No such price"
      const isNoSuchPriceError = fullErrorMessage?.toLowerCase().includes('no such price') ||
                                  priceCheckError?.code === 'resource_missing';
      
      // Verificar incompatibilidade test/live mode
      const isTestModeError = fullErrorMessage?.toLowerCase().includes('test mode') || 
                              fullErrorMessage?.toLowerCase().includes('test mode key') ||
                              fullErrorMessage?.toLowerCase().includes('but a test mode key');
      const isLiveModeError = fullErrorMessage?.toLowerCase().includes('live mode') || 
                              fullErrorMessage?.toLowerCase().includes('live mode key') ||
                              fullErrorMessage?.toLowerCase().includes('but a live mode key');
      
      // Se o price não existe, bloquear o checkout com mensagem clara
      if (isNoSuchPriceError || priceCheckError?.code === 'resource_missing') {
        let errorMessage = 'Price ID não encontrado no Stripe';
        let errorDetails = `O Price ID "${validatedPriceId}" não existe na sua conta Stripe.`;
        
        if (isTestModeError || isLiveModeError) {
          errorMessage = 'Incompatibilidade entre chave e Price ID';
          const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 'DESCONHECIDO';
          
          // Mensagem mais específica baseada no tipo de erro
          if (isTestModeError && fullErrorMessage?.toLowerCase().includes('similar object exists in live mode')) {
            errorDetails = `❌ INCOMPATIBILIDADE DETECTADA: A chave secreta configurada é de TESTE (sk_test_...), mas o Price ID "${validatedPriceId}" existe apenas em modo PRODUÇÃO (live mode). SOLUÇÕES: 1) Use um Price ID de TESTE no banco de dados, OU 2) Configure chaves de PRODUÇÃO na tabela stripe_config. Execute o script fix_environment_mismatch.sql para mais detalhes.`;
          } else if (isLiveModeError && fullErrorMessage?.toLowerCase().includes('similar object exists in test mode')) {
            errorDetails = `❌ INCOMPATIBILIDADE DETECTADA: A chave secreta configurada é de PRODUÇÃO (sk_live_...), mas o Price ID "${validatedPriceId}" existe apenas em modo TESTE (test mode). SOLUÇÕES: 1) Use um Price ID de PRODUÇÃO no banco de dados, OU 2) Configure chaves de TESTE na tabela stripe_config. Execute o script fix_environment_mismatch.sql para mais detalhes.`;
          } else {
            errorDetails = `A chave secreta configurada é de ${secretKeyType}, mas o Price ID "${validatedPriceId}" não existe ou é do ambiente oposto. Verifique: 1) Se o Price ID está correto na tabela subscription_plans, 2) Se foi criado no ambiente correto (test/live) no Stripe Dashboard, 3) Se a chave na tabela stripe_config corresponde ao ambiente do Price ID.`;
          }
        } else {
          const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 'DESCONHECIDO';
          errorDetails = `O Price ID "${validatedPriceId}" não existe na sua conta Stripe no ambiente de ${secretKeyType}. Verifique: 1) Se o ID está correto na tabela subscription_plans, 2) Se foi criado no ambiente correto (test/live) no Stripe Dashboard, 3) Se o Price não foi arquivado ou deletado.`;
        }
        
        console.error('[Checkout Session] ❌ Price ID não encontrado no Stripe:', {
          priceId: validatedPriceId,
          error: fullErrorMessage,
          errorCode: priceCheckError?.code,
          errorType: priceCheckError?.type,
          secretKeyType: stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN',
        });
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: errorDetails,
            stripeErrorCode: priceCheckError?.code || null,
            stripeErrorType: priceCheckError?.type || null,
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Outros erros - verificar se é erro crítico ou pode continuar
      const isCriticalError = isNoSuchPriceError || 
                              isTestModeError || 
                              isLiveModeError ||
                              priceCheckError?.code === 'resource_missing';
      
      if (isCriticalError) {
        // Erro crítico - bloquear checkout
        let errorMessage = 'Erro ao verificar Price ID no Stripe';
        let errorDetails = fullErrorMessage || 'Erro desconhecido ao verificar Price ID';
        
        if (isTestModeError || isLiveModeError) {
          errorMessage = 'Incompatibilidade entre chave e Price ID';
          const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 'DESCONHECIDO';
          errorDetails = `A chave secreta configurada é de ${secretKeyType}, mas o Price ID "${validatedPriceId}" não existe ou é do ambiente oposto. Verifique: 1) Se o Price ID está correto na tabela subscription_plans, 2) Se foi criado no ambiente correto (test/live) no Stripe Dashboard, 3) Se a chave na tabela stripe_config corresponde ao ambiente do Price ID.`;
        }
        
        console.error('[Checkout Session] ❌ Erro crítico ao verificar price no Stripe:', {
          error: fullErrorMessage,
          errorType: priceCheckError?.type,
          errorCode: priceCheckError?.code,
          priceId: validatedPriceId,
        });
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: errorDetails,
            stripeErrorCode: priceCheckError?.code || null,
            stripeErrorType: priceCheckError?.type || null,
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Erros não críticos - logar mas continuar (pode ser erro temporário da API)
      console.warn('[Checkout Session] ⚠️ Erro ao verificar price no Stripe (continuando):', {
        error: fullErrorMessage,
        errorType: priceCheckError?.type,
        errorCode: priceCheckError?.code,
        priceId: validatedPriceId,
        warning: 'Continuando mesmo assim - pode ser erro temporário da API',
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already has a subscription
    // Allow checkout in these cases:
    // 1. User has Free plan (upgrade) - SEMPRE PERMITIR
    // 2. User wants to change to a different plan (upgrade/downgrade)
    // 3. Subscription expires in less than 30 days (early renewal)
    // 4. Subscription was cancelled but still active (reactivation)
    const { data: existingSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          price
        )
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled', 'canceled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Se houver erro na query, logar mas continuar (pode não ter assinatura)
    if (subError) {
      console.warn('[Checkout Session] Erro ao buscar assinatura existente (continuando):', subError);
    }

    // Se não há assinatura, permitir checkout normalmente
    if (!existingSubscription) {
      console.log('[Checkout Session] Usuário não tem assinatura, permitindo checkout');
    } else if (existingSubscription && !subError) {
      let existingPlan = existingSubscription.subscription_plans;
      
      // Verificação robusta de plano Free
      // Free plan ID conhecido: b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5
      const FREE_PLAN_ID = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';
      
      // Se o plano não veio na query, buscar diretamente pelo plan_id da assinatura
      if (!existingPlan && existingSubscription.plan_id) {
        console.log('[Checkout Session] Plano não veio na query, buscando diretamente:', existingSubscription.plan_id);
        const { data: planData, error: planFetchError } = await supabase
          .from('subscription_plans')
          .select('id, name, price')
          .eq('id', existingSubscription.plan_id)
          .single();
        
        if (!planFetchError && planData) {
          existingPlan = planData;
          console.log('[Checkout Session] Plano encontrado:', planData);
        } else {
          console.warn('[Checkout Session] Erro ao buscar plano:', planFetchError);
        }
      }
      
      // Verificar se tem plan_id na assinatura (mesmo que o plano não tenha vindo na query)
      const subscriptionPlanId = existingSubscription.plan_id ? String(existingSubscription.plan_id) : null;
      const existingPlanId = existingPlan?.id ? String(existingPlan.id) : subscriptionPlanId;
      const planName = existingPlan?.name?.toLowerCase()?.trim() || '';
      const planPrice = existingPlan?.price;
      
      // Converter preço para número para comparação (pode vir como string ou número)
      const priceAsNumber = planPrice !== null && planPrice !== undefined 
        ? parseFloat(String(planPrice)) 
        : null;
      
      // Verificação múltipla de plano Free (qualquer uma dessas condições indica Free)
      // PRIORIDADE 1: Verificar por ID da assinatura (mais confiável, funciona mesmo sem dados do plano)
      const isFreePlanBySubscriptionId = subscriptionPlanId === FREE_PLAN_ID || 
                                         (subscriptionPlanId && String(subscriptionPlanId).toLowerCase() === String(FREE_PLAN_ID).toLowerCase());
      
      // PRIORIDADE 2: Verificar por ID do plano (se tivermos dados do plano)
      const isFreePlanByPlanId = existingPlanId === FREE_PLAN_ID || 
                                 (existingPlanId && String(existingPlanId).toLowerCase() === String(FREE_PLAN_ID).toLowerCase());
      
      // PRIORIDADE 3: Verificar por preço (só se tivermos dados do plano)
      const isFreePlanByPrice = existingPlan && (priceAsNumber === 0 || priceAsNumber === null || isNaN(priceAsNumber));
      
      // PRIORIDADE 4: Verificar por nome (só se tivermos dados do plano)
      const isFreePlanByName = existingPlan && (
        planName === 'free' || planName === 'gratuito' || 
        planName === 'plano free' || planName === 'plano gratuito' ||
        planName.includes('free') || planName.includes('gratuito')
      );
      
      // Se qualquer verificação indicar Free plan, permitir checkout
      // CRÍTICO: Se o plan_id da assinatura for Free, sempre permitir (mesmo sem dados do plano)
      const isFreePlan = isFreePlanBySubscriptionId || isFreePlanByPlanId || isFreePlanByPrice || isFreePlanByName;

      console.log('[Checkout Session] Verificando assinatura existente:', {
        subscriptionPlanId,
        existingPlanId,
        freePlanId: FREE_PLAN_ID,
        isFreePlanBySubscriptionId,
        isFreePlanByPlanId,
        isFreePlanByPrice,
        isFreePlanByName,
        requestedPlanId: planId, // planId do body = plano que usuário quer assinar
        planName: existingPlan?.name,
        planPrice,
        priceAsNumber,
        isFreePlan,
        status: existingSubscription.status,
        hasPlanData: !!existingPlan,
      });

      // If it's a Free plan, always allow checkout (treat as no subscription)
      // CRÍTICO: Free plan = sem assinatura válida, sempre permitir checkout
      if (isFreePlan) {
        const reason = isFreePlanBySubscriptionId ? 'Subscription ID match' : 
                      isFreePlanByPlanId ? 'Plan ID match' : 
                      isFreePlanByPrice ? 'Price match' : 
                      'Name match';
        console.log('[Checkout Session] ✅ Usuário tem plano Free, permitindo checkout (tratado como sem assinatura):', {
          planName: existingPlan?.name,
          subscriptionPlanId,
          existingPlanId,
          requestedPlanId: planId,
          reason,
        });
        // Continue to create checkout - don't block, skip all other validations
      } else {
        // User has a paid plan - allow checkout in these cases:
        // 1. Different plan (upgrade/downgrade)
        // 2. Same plan but expiring soon (early renewal)
        // 3. Same plan and cancelled (reactivation)
        // 4. Same plan and user explicitly wants to renew (always allow for flexibility)
        
        const isDifferentPlan = existingPlanId && existingPlanId !== planId;
        
        // Check if subscription is expiring soon (within 30 days)
        let isExpiringSoon = false;
        if (existingSubscription && existingSubscription.expires_at) {
          try {
            const expiresAt = new Date(existingSubscription.expires_at);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
          } catch (dateError) {
            console.warn('[Checkout Session] Erro ao processar data de expiração:', dateError);
            isExpiringSoon = false;
          }
        }

        // Check if subscription was cancelled (but may still be active until expiry)
        const isCancelled = existingSubscription && (
          existingSubscription.status === 'cancelled' || 
          existingSubscription.status === 'canceled'
        );

        // SEMPRE PERMITIR CHECKOUT - o Stripe gerenciará a renovação/upgrade
        // A UI já tem as verificações necessárias, então se o usuário chegou aqui, deixar prosseguir
        if (isDifferentPlan) {
          console.log('[Checkout Session] ✅ Permitindo mudança de plano:', {
            currentPlan: existingPlan?.name,
            currentPlanId: existingPlanId,
            newPlanId: planId,
          });
        } else if (isExpiringSoon) {
          console.log('[Checkout Session] ✅ Permitindo renovação antecipada:', {
            planName: existingPlan?.name,
            expiresAt: existingSubscription?.expires_at,
          });
        } else if (isCancelled) {
          console.log('[Checkout Session] ✅ Permitindo reativação de assinatura cancelada:', {
            planName: existingPlan?.name,
          });
        } else {
          // MUDANÇA: Permitir renovação mesmo para o mesmo plano ativo
          // O Stripe gerenciará se é upgrade, downgrade ou renovação
          console.log('[Checkout Session] ✅ Permitindo renovação/checkout para o mesmo plano:', {
            planName: existingPlan?.name,
            planPrice: existingPlan?.price,
            subscriptionPlanId,
            existingPlanId,
            expiresAt: existingSubscription?.expires_at,
            note: 'Usuário solicitou checkout explicitamente - Stripe gerenciará a cobrança',
          });
          // Continuar para criar checkout - não bloquear mais
        }
      }
    }


    // Create or get Stripe customer
    let customerId = existingSubscription?.stripe_customer_id

    if (!customerId) {
      try {
        console.log('[Checkout Session] Criando novo customer no Stripe para usuário:', userId);
        const customer = await stripe.customers.create({
          email: profile.email,
          name: profile.name,
          metadata: {
            user_id: userId,
          },
        })
        customerId = customer.id
        console.log('[Checkout Session] Customer criado com sucesso:', customerId);
      } catch (stripeError) {
        console.error('[Checkout Session] Erro ao criar customer no Stripe:', stripeError);
        throw new Error(`Erro ao criar customer no Stripe: ${stripeError instanceof Error ? stripeError.message : 'Erro desconhecido'}`);
      }
    } else {
      console.log('[Checkout Session] Usando customer existente:', customerId);
    }

    // Usar Price ID do Stripe (já validado acima)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: validatedPriceId, // Usar o Price ID validado
        quantity: 1,
      },
    ];

    console.log('[Checkout Session] 📦 Line items preparados para checkout:', {
      priceId: validatedPriceId,
      planName: plan.name,
      planId: plan.id,
      amount: plan.price,
      currency: 'BRL',
      quantity: 1,
    });

    // Create Stripe checkout session
    let session;
    let checkoutParams: Stripe.Checkout.SessionCreateParams | undefined;
    try {
      checkoutParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        success_url: successUrl || `${siteUrl}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${siteUrl}/plans/cancel`,
        metadata: {
          user_id: userId,
          plan_id: planId,
          plan_name: plan.name,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            plan_id: planId,
            plan_name: plan.name,
          },
        },
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
      };

      // ============================================
      // 🔑 LOG CONSOLIDADO DE TODAS AS CHAVES E CONFIGURAÇÕES
      // ============================================
      console.group('🔑 [CHECKOUT SESSION] RESUMO COMPLETO DAS CONFIGURAÇÕES QUE SERÃO USADAS:');
      
      const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : 
                           stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 
                           'DESCONHECIDO';
      
      const priceIdType = validatedPriceId.length >= 30 ? 'PRODUÇÃO' : 
                         validatedPriceId.length > 0 ? 'TESTE' : 
                         'NÃO CONFIGURADO';
      
      const isCompatible = (secretKeyType === 'PRODUÇÃO' && priceIdType === 'PRODUÇÃO') ||
                          (secretKeyType === 'TESTE' && priceIdType === 'TESTE');
      
      console.log('🔐 [CHECKOUT SESSION] Chaves do Stripe:', {
        secretKeyType: secretKeyType,
        secretKeyPrefix: stripeSecretKey.substring(0, 20) + '...',
        secretKeyLength: stripeSecretKey.length,
        secretKeySource: stripeConfig?.secret_key ? 'Banco de Dados (stripe_config)' : 
                        Deno.env.get('STRIPE_SECRET_KEY') ? 'Variável de Ambiente (Deno.env)' : 
                        'NÃO CONFIGURADO',
        publishableKeyType: stripeConfig?.publishable_key ? 
          (stripeConfig.publishable_key.startsWith('pk_live_') ? 'PRODUÇÃO' : 
           stripeConfig.publishable_key.startsWith('pk_test_') ? 'TESTE' : 
           'DESCONHECIDO') : 
          'NÃO CONFIGURADO',
        publishableKeyPrefix: stripeConfig?.publishable_key ? 
          stripeConfig.publishable_key.substring(0, 20) + '...' : 
          'NÃO CONFIGURADO',
        environment: stripeConfig?.environment || 'NÃO CONFIGURADO',
        hasWebhookSecret: !!stripeConfig?.webhook_secret,
        webhookSecretPrefix: stripeConfig?.webhook_secret ? 
          stripeConfig.webhook_secret.substring(0, 20) + '...' : 
          'NÃO CONFIGURADO',
      });
      
      console.log('📦 [CHECKOUT SESSION] Informações do Plano:', {
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        planCurrency: 'BRL',
        planIsActive: plan.is_active,
        stripeProductId: plan.stripe_product_id || 'NÃO CONFIGURADO',
        stripePriceId: validatedPriceId,
        stripePriceIdOriginal: plan.stripe_price_id || 'NÃO CONFIGURADO',
        stripePriceIdLength: validatedPriceId.length,
        priceIdType: priceIdType,
      });
      
      console.log('👤 [CHECKOUT SESSION] Informações do Usuário:', {
        userId: userId,
        customerId: customerId || 'SERÁ CRIADO',
        userEmail: profile.email,
        userName: profile.name,
        hasExistingSubscription: !!existingSubscription,
        existingSubscriptionStatus: existingSubscription?.status || 'N/A',
        existingPlanId: existingSubscription?.plan_id || 'N/A',
      });
      
      console.log('🌐 [CHECKOUT SESSION] URLs e Configurações:', {
        siteUrl: siteUrl,
        successUrl: checkoutParams.success_url,
        cancelUrl: checkoutParams.cancel_url,
        mode: 'subscription',
        paymentMethodTypes: ['card'],
        billingAddressCollection: 'required',
      });
      
      console.log('⚠️ [CHECKOUT SESSION] Verificação de Compatibilidade:', {
        secretKeyEnvironment: secretKeyType,
        priceIdEnvironment: priceIdType,
        isCompatible: isCompatible ? '✅ COMPATÍVEL' : '❌ INCOMPATÍVEL',
        warning: !isCompatible ? 
          `❌ INCOMPATIBILIDADE DETECTADA: Chave ${secretKeyType} com Price ID ${priceIdType}. Isso causará erro no Stripe!` : 
          '✅ Configuração compatível - checkout deve funcionar',
        recommendation: !isCompatible ? 
          `SOLUÇÃO: ${secretKeyType === 'TESTE' ? 
            'Atualize o Price ID para um de TESTE, OU atualize a chave para PRODUÇÃO' : 
            'Atualize o Price ID para um de PRODUÇÃO, OU atualize a chave para TESTE'}` : 
          null,
      });
      
      console.log('📋 [CHECKOUT SESSION] Parâmetros que serão enviados ao Stripe:', {
        customer: customerId,
        lineItems: lineItems.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
        mode: 'subscription',
        metadata: {
          user_id: userId,
          plan_id: planId,
          plan_name: plan.name,
        },
        subscriptionMetadata: {
          user_id: userId,
          plan_id: planId,
          plan_name: plan.name,
        },
      });
      
      console.log('⏰ [CHECKOUT SESSION] Timestamp:', {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        totalTimeUntilNow: Date.now() - startTime + 'ms',
      });
      
      console.groupEnd();
      
      console.log('[Checkout Session] 🚀 Criando sessão de checkout no Stripe com parâmetros FINAIS:', {
        customerId,
        planId_DO_REQUEST: planId,
        planId_DO_BANCO: plan.id,
        planName: plan.name,
        lineItemsCount: lineItems.length,
        priceId_FINAL_USADO: validatedPriceId,
        priceId_DO_BANCO_ORIGINAL: plan.stripe_price_id,
        productId: productId || 'N/A',
        mode: 'subscription',
        successUrl: checkoutParams.success_url,
        cancelUrl: checkoutParams.cancel_url,
        timestamp: new Date().toISOString(),
        lineItems: lineItems.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
      });

      const sessionCreateStart = Date.now();
      console.log('[Checkout Session] ⏳ Chamando Stripe API para criar sessão...', {
        requestId,
        step: 'stripe_api_call',
        timestamp: new Date().toISOString(),
      });
      
      session = await stripe.checkout.sessions.create(checkoutParams);
      
      console.log('[Checkout Session] ✅ Sessão de checkout criada com sucesso:', {
        requestId,
        sessionId: session.id,
        url: session.url,
        status: session.status,
        customerId: session.customer,
        paymentStatus: session.payment_status,
        mode: session.mode,
        apiCallTime: Date.now() - sessionCreateStart + 'ms',
        totalTime: Date.now() - startTime + 'ms',
      });
    } catch (stripeError: any) {
      const secretKeyType = stripeSecretKey.startsWith('sk_live_') ? 'PRODUCTION' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
      
      // Extrair mensagem de erro completa (pode estar em diferentes propriedades)
      const fullErrorMessage = stripeError?.message || 
                               stripeError?.raw?.message || 
                               stripeError?.raw?.error?.message ||
                               JSON.stringify(stripeError) ||
                               'Unknown error';
      
      console.error('[Checkout Session] ❌ Erro ao criar sessão de checkout no Stripe:', {
        requestId,
        errorType: stripeError?.type || 'unknown',
        errorCode: stripeError?.code || 'no_code',
        errorMessage: fullErrorMessage,
        errorName: stripeError?.name,
        errorStack: stripeError?.stack,
        errorDetails: stripeError?.raw || stripeError,
        errorHeaders: stripeError?.headers,
        errorRequestId: stripeError?.requestId,
        errorStatusCode: stripeError?.statusCode,
        priceId: validatedPriceId,
        priceIdLength: validatedPriceId?.length || 0,
        productId: productId || 'N/A',
        planId: plan?.id || 'N/A',
        planName: plan?.name || 'N/A',
        customerId: customerId || 'N/A',
        secretKeyType: secretKeyType,
        secretKeyPrefix: stripeSecretKey.substring(0, 12) + '...',
        checkoutParams: typeof checkoutParams !== 'undefined' ? {
          mode: checkoutParams.mode,
          paymentMethodTypes: checkoutParams.payment_method_types,
          lineItemsCount: checkoutParams.line_items?.length || 0,
          hasCustomer: !!checkoutParams.customer,
          hasMetadata: !!checkoutParams.metadata,
        } : 'not defined',
        commonIssue: fullErrorMessage?.includes('test mode') || fullErrorMessage?.includes('live mode') || fullErrorMessage?.includes('No such price') || fullErrorMessage?.includes('similar object exists')
          ? fullErrorMessage?.includes('similar object exists in live mode, but a test mode key')
            ? 'INCOMPATIBILIDADE CRÍTICA: Price ID é de PRODUÇÃO, mas chave é de TESTE. Use chave de produção OU use Price ID de teste.'
            : fullErrorMessage?.includes('similar object exists in test mode, but a live mode key')
            ? 'INCOMPATIBILIDADE CRÍTICA: Price ID é de TESTE, mas chave é de PRODUÇÃO. Use chave de teste OU use Price ID de produção.'
            : 'INCOMPATIBILIDADE: A chave e o Price ID devem ser do mesmo ambiente (test ou live), ou o Price ID não existe'
          : null,
        totalTime: Date.now() - startTime + 'ms',
      });

      // Mapear erros específicos do Stripe para mensagens amigáveis
      let errorMessage = 'Erro ao criar sessão de checkout';
      let errorDetails = fullErrorMessage;
      
      // Verificar se é erro de "No such price" (pode estar em diferentes formatos)
      const isNoSuchPriceError = fullErrorMessage?.includes('No such price') || 
                                  fullErrorMessage?.includes('no such price') ||
                                  stripeError?.code === 'resource_missing';
      
      // Verificar incompatibilidade test/live mode - padrões específicos do Stripe
      const errorLower = fullErrorMessage?.toLowerCase() || '';
      const isTestModeError = errorLower.includes('test mode') || 
                              errorLower.includes('test mode key') ||
                              errorLower.includes('but a test mode key') ||
                              errorLower.includes('similar object exists in live mode, but a test mode key') ||
                              errorLower.includes('exists in live mode, but a test mode key was used');
      const isLiveModeError = errorLower.includes('live mode') || 
                              errorLower.includes('live mode key') ||
                              errorLower.includes('but a live mode key') ||
                              errorLower.includes('similar object exists in test mode, but a live mode key') ||
                              errorLower.includes('exists in test mode, but a live mode key was used');
      
      if (stripeError?.type === 'StripeInvalidRequestError' || isNoSuchPriceError) {
        if (stripeError?.code === 'resource_missing' || isNoSuchPriceError) {
          if (isTestModeError || isLiveModeError) {
            errorMessage = 'Incompatibilidade entre chave e Price ID';
            const secretKeyTypeText = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 'DESCONHECIDO';
            
            // Mensagem mais específica baseada no tipo de erro
            if (isTestModeError && errorLower.includes('similar object exists in live mode')) {
              errorDetails = `❌ INCOMPATIBILIDADE DETECTADA: A chave secreta configurada é de TESTE (sk_test_...), mas o Price ID "${validatedPriceId}" existe apenas em modo PRODUÇÃO (live mode). SOLUÇÕES: 1) Use um Price ID de TESTE no banco de dados (crie um novo preço no Stripe Dashboard em modo Test), OU 2) Configure chaves de PRODUÇÃO na tabela stripe_config. Execute o script fix_environment_mismatch.sql para mais detalhes.`;
            } else if (isLiveModeError && errorLower.includes('similar object exists in test mode')) {
              errorDetails = `❌ INCOMPATIBILIDADE DETECTADA: A chave secreta configurada é de PRODUÇÃO (sk_live_...), mas o Price ID "${validatedPriceId}" existe apenas em modo TESTE (test mode). SOLUÇÕES: 1) Use um Price ID de PRODUÇÃO no banco de dados, OU 2) Configure chaves de TESTE na tabela stripe_config. Execute o script fix_environment_mismatch.sql para mais detalhes.`;
            } else {
              errorDetails = `A chave secreta configurada é de ${secretKeyTypeText}, mas o Price ID "${validatedPriceId}" não existe ou é do ambiente oposto. Verifique: 1) Se o Price ID está correto na tabela subscription_plans, 2) Se foi criado no ambiente correto (test/live) no Stripe Dashboard, 3) Se a chave na tabela stripe_config corresponde ao ambiente do Price ID.`;
            }
          } else {
            errorMessage = 'Price ID não encontrado no Stripe';
            errorDetails = `O Price ID "${validatedPriceId}" não existe na sua conta Stripe no ambiente ${secretKeyType === 'PRODUCTION' ? 'de PRODUÇÃO' : 'de TESTE'}. Verifique: 1) Se o ID está correto, 2) Se foi criado no ambiente correto (test/live) no Stripe Dashboard, 3) Se o Price não foi arquivado ou deletado.`;
          }
        } else if (stripeError?.code === 'parameter_invalid_empty') {
          errorMessage = 'Price ID inválido ou vazio';
          errorDetails = 'O Price ID fornecido está vazio ou é inválido. Verifique a configuração do plano na tabela subscription_plans.';
        } else if (stripeError?.code === 'parameter_invalid_integer') {
          errorMessage = 'Parâmetro inválido';
          errorDetails = fullErrorMessage || 'Um dos parâmetros enviados ao Stripe é inválido.';
        } else {
          errorMessage = 'Erro na requisição ao Stripe';
          errorDetails = fullErrorMessage || 'A requisição ao Stripe falhou. Verifique os parâmetros.';
        }
      } else if (stripeError?.type === 'StripeAPIError') {
        errorMessage = 'Erro na API do Stripe';
        errorDetails = fullErrorMessage || 'Erro ao se comunicar com a API do Stripe.';
      } else if (stripeError?.type === 'StripeConnectionError') {
        errorMessage = 'Erro de conexão com Stripe';
        errorDetails = 'Não foi possível conectar ao Stripe. Verifique sua conexão com a internet.';
      } else if (isNoSuchPriceError || isTestModeError || isLiveModeError) {
        // Fallback: se detectamos o erro mas não foi capturado acima
        errorMessage = 'Price ID não encontrado ou incompatível';
        const secretKeyTypeText = stripeSecretKey.startsWith('sk_live_') ? 'PRODUÇÃO' : stripeSecretKey.startsWith('sk_test_') ? 'TESTE' : 'DESCONHECIDO';
        errorDetails = `O Price ID "${validatedPriceId}" não existe ou é incompatível com a chave de ${secretKeyTypeText}. Verifique: 1) Se o Price ID está correto, 2) Se foi criado no ambiente correto (test/live), 3) Se a chave e o Price ID são do mesmo ambiente.`;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          stripeErrorCode: stripeError?.code || null,
          stripeErrorType: stripeError?.type || null,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the checkout session creation (removed RPC call as log_audit_event doesn't exist)
    console.log('Checkout session created:', {
      session_id: session.id,
      plan_id: planId,
      plan_name: plan.name,
      amount: plan.price,
      currency: 'BRL',
    })

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    // Log detalhado do erro
    const requestId = (error as any)?.requestId || 'unknown';
    const errorDetails: any = {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      errorType: typeof error,
      errorString: String(error),
      errorConstructor: error?.constructor?.name,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
    };

    // Se for um erro do Stripe, adicionar mais detalhes
    if (error && typeof error === 'object' && 'type' in error) {
      errorDetails.stripeErrorType = (error as any).type;
      errorDetails.stripeErrorCode = (error as any).code;
      errorDetails.stripeErrorMessage = (error as any).message;
      errorDetails.stripeErrorRaw = (error as any).raw;
      errorDetails.stripeErrorHeaders = (error as any).headers;
      errorDetails.stripeErrorRequestId = (error as any).requestId;
      errorDetails.stripeErrorStatusCode = (error as any).statusCode;
    }
    
    // Se for um erro de Response, tentar extrair informações
    if (error instanceof Response) {
      errorDetails.isResponse = true;
      errorDetails.responseStatus = error.status;
      errorDetails.responseStatusText = error.statusText;
      try {
        const responseText = await error.clone().text();
        errorDetails.responseBody = responseText;
        try {
          errorDetails.responseJson = JSON.parse(responseText);
        } catch {
          // Não é JSON
        }
      } catch {
        // Não foi possível ler o body
      }
    }

    const finalStartTime = typeof startTime !== 'undefined' ? startTime : Date.now();
    console.error('[Checkout Session] ❌ Erro não tratado ao criar checkout session:', {
      ...errorDetails,
      totalTime: Date.now() - finalStartTime + 'ms',
      timestamp: new Date().toISOString(),
    });
    
    // Se já foi retornado uma resposta com erro específico do Stripe, não retornar outro
    if (error instanceof Response) {
      return error;
    }
    
    // Mensagem de erro mais detalhada
    let userFriendlyMessage = 'Erro interno do servidor ao processar checkout';
    let technicalDetails = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Tentar extrair mais informações do erro
    if (error && typeof error === 'object') {
      // Se for erro do Stripe, usar mensagem específica
      if ('type' in error && 'message' in error) {
        technicalDetails = (error as any).message || technicalDetails;
        if ((error as any).code) {
          technicalDetails += ` (Código: ${(error as any).code})`;
        }
      }
    }
    
    // Verificar se é um erro específico conhecido
    if (error instanceof Error) {
      if (error.message.includes('secret key') || error.message.includes('Stripe secret key')) {
        userFriendlyMessage = 'Erro de configuração do Stripe';
        technicalDetails = 'A chave secreta do Stripe não está configurada corretamente. Verifique a tabela stripe_config.';
      } else if (error.message.includes('Price ID') || error.message.includes('price_')) {
        userFriendlyMessage = 'Erro na configuração do plano';
        technicalDetails = 'O Price ID do Stripe pode estar incorreto ou não existir no ambiente de produção.';
      } else if (error.message.includes('Product ID') || error.message.includes('prod_')) {
        userFriendlyMessage = 'Erro na configuração do produto';
        technicalDetails = 'O Product ID do Stripe pode estar incorreto ou não existir no ambiente de produção.';
      }
    }
    
    // Retornar erro com mais detalhes para debug
    const errorResponse = {
      error: userFriendlyMessage,
      details: technicalDetails,
      errorType: error instanceof Error ? error.name : typeof error,
      stripeErrorCode: errorDetails.stripeErrorCode || null,
      stripeErrorType: errorDetails.stripeErrorType || null,
      // Adicionar stack trace apenas em desenvolvimento (não em produção)
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    };
    
    console.error('[Checkout Session] ❌ Retornando erro ao cliente:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})












