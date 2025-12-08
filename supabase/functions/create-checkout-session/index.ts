import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    let body;
    try {
      const bodyText = await req.text();
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('[Checkout Session] Erro ao parsear body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { planId, userId, successUrl, cancelUrl, _stripeSecretKey, _siteUrl } = body

    // Debug: log do que foi recebido (sem expor a chave completa)
    console.log('[Checkout Session] Request recebido:', {
      hasPlanId: !!planId,
      hasUserId: !!userId,
      hasStripeKey: !!_stripeSecretKey,
      stripeKeyPrefix: _stripeSecretKey ? _stripeSecretKey.substring(0, 10) + '...' : 'missing',
      siteUrl: _siteUrl,
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe secret key from Supabase (stripe_config table)
    // Fallback to request body or Deno.env for backward compatibility
    let stripeSecretKey = '';
    let siteUrl = _siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:8080';

    try {
      // Try to get active Stripe config from Supabase
      const { data: stripeConfig, error: configError } = await supabase
        .from('stripe_config')
        .select('secret_key')
        .eq('is_active', true)
        .maybeSingle();

      if (!configError && stripeConfig?.secret_key) {
        stripeSecretKey = stripeConfig.secret_key;
        console.log('[Checkout Session] Usando secret_key do Supabase (stripe_config)');
      } else {
        // Fallback to request body or Deno.env
        stripeSecretKey = _stripeSecretKey || Deno.env.get('STRIPE_SECRET_KEY') || '';
        if (stripeSecretKey) {
          console.warn('[Checkout Session] Usando secret_key do fallback (.env ou request body)');
        }
      }
    } catch (error) {
      console.warn('[Checkout Session] Erro ao buscar config do Supabase, usando fallback:', error);
      stripeSecretKey = _stripeSecretKey || Deno.env.get('STRIPE_SECRET_KEY') || '';
    }

    if (!stripeSecretKey) {
      console.error('[Checkout Session] Stripe secret key não configurada')
      return new Response(
        JSON.stringify({ 
          error: 'Stripe secret key not configured',
          details: 'Configure a secret_key na tabela stripe_config do Supabase ou use variável de ambiente STRIPE_SECRET_KEY'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })

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
        planId: planId,
        error: planError,
        planFound: !!plan,
      });
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
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
    console.log('[Checkout Session] ✅ IDs validados e que serão usados no checkout:', {
      priceId_ANTES_TRIM: priceId,
      priceId_DEPOIS_TRIM: finalPriceId,
      priceId_LENGTH: finalPriceId.length,
      productId: productId || 'NÃO CONFIGURADO (Stripe usará o product do price)',
      planId: plan.id,
      planName: plan.name,
      timestamp: new Date().toISOString(),
    });
    
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
    
    // Verificar se o price pertence ao product no Stripe (validação opcional)
    if (productId) {
      try {
        console.log('[Checkout Session] 🔍 Verificando se price pertence ao product no Stripe...');
        const priceObj = await stripe.prices.retrieve(validatedPriceId);
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
      } catch (priceCheckError: any) {
        console.error('[Checkout Session] ❌ Erro ao verificar price no Stripe:', {
          error: priceCheckError?.message,
          errorType: priceCheckError?.type,
          priceId: validatedPriceId,
          warning: 'Continuando mesmo assim - pode ser que o price não exista ou a API falhou',
        });
        // Não bloquear o checkout por causa disso, apenas logar
      }
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
    try {
      const checkoutParams: Stripe.Checkout.SessionCreateParams = {
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

      session = await stripe.checkout.sessions.create(checkoutParams);
      
      console.log('[Checkout Session] ✅ Sessão de checkout criada com sucesso:', {
        sessionId: session.id,
        url: session.url,
        status: session.status,
        customerId: session.customer,
      });
    } catch (stripeError: any) {
      console.error('[Checkout Session] ❌ Erro ao criar sessão de checkout no Stripe:', {
        errorType: stripeError?.type || 'unknown',
        errorCode: stripeError?.code || 'no_code',
        errorMessage: stripeError?.message || 'Unknown error',
        errorDetails: stripeError?.raw || stripeError,
        priceId: validatedPriceId,
        productId: productId || 'N/A',
        planId: plan.id,
        planName: plan.name,
        customerId: customerId,
      });

      // Mapear erros específicos do Stripe para mensagens amigáveis
      let errorMessage = 'Erro ao criar sessão de checkout';
      let errorDetails = stripeError?.message || 'Erro desconhecido';
      
      if (stripeError?.type === 'StripeInvalidRequestError') {
        if (stripeError?.code === 'resource_missing') {
          errorMessage = 'Price ID não encontrado no Stripe';
          errorDetails = `O Price ID "${validatedPriceId}" não existe na sua conta Stripe. Verifique se o ID está correto e se foi criado no ambiente correto (test/live).`;
        } else if (stripeError?.code === 'parameter_invalid_empty') {
          errorMessage = 'Price ID inválido ou vazio';
          errorDetails = 'O Price ID fornecido está vazio ou é inválido. Verifique a configuração do plano.';
        } else if (stripeError?.code === 'parameter_invalid_integer') {
          errorMessage = 'Parâmetro inválido';
          errorDetails = stripeError.message || 'Um dos parâmetros enviados ao Stripe é inválido.';
        } else {
          errorMessage = 'Erro na requisição ao Stripe';
          errorDetails = stripeError.message || 'A requisição ao Stripe falhou. Verifique os parâmetros.';
        }
      } else if (stripeError?.type === 'StripeAPIError') {
        errorMessage = 'Erro na API do Stripe';
        errorDetails = stripeError.message || 'Erro ao se comunicar com a API do Stripe.';
      } else if (stripeError?.type === 'StripeConnectionError') {
        errorMessage = 'Erro de conexão com Stripe';
        errorDetails = 'Não foi possível conectar ao Stripe. Verifique sua conexão com a internet.';
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
    console.error('[Checkout Session] ❌ Erro não tratado ao criar checkout session:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      errorType: typeof error,
      errorString: String(error),
    });
    
    // Se já foi retornado uma resposta com erro específico do Stripe, não retornar outro
    if (error instanceof Response) {
      return error;
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor ao processar checkout',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        errorType: error instanceof Error ? error.name : typeof error,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})












