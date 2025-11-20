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

    // Use Stripe secret key from request body (from .env) or fallback to Deno.env
    const stripeSecretKey = _stripeSecretKey || Deno.env.get('STRIPE_SECRET_KEY') || ''
    const siteUrl = _siteUrl || Deno.env.get('SITE_URL') || 'http://localhost:8080'

    if (!stripeSecretKey) {
      console.error('[Checkout Session] Stripe secret key não configurada')
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
        // Verificação adicional de segurança: se não temos certeza, verificar novamente antes de bloquear
        // Se o plan_id da assinatura não foi verificado corretamente, tentar uma última vez
        if (subscriptionPlanId && !isFreePlan) {
          console.log('[Checkout Session] ⚠️ Verificação adicional: plan_id da assinatura não é Free, mas verificando novamente...', {
            subscriptionPlanId,
            freePlanId: FREE_PLAN_ID,
            match: subscriptionPlanId === FREE_PLAN_ID,
          });
        }
        // User has a paid plan - check if checkout should be allowed
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

        // Allow checkout if:
        // - User wants a different plan (upgrade/downgrade)
        // - Subscription is expiring soon (early renewal)
        // - Subscription was cancelled (reactivation)
        if (isDifferentPlan) {
          console.log('[Checkout Session] Permitindo mudança de plano:', {
            currentPlan: existingPlan?.name,
            currentPlanId: existingPlanId,
            newPlanId: planId,
          });
        } else if (isExpiringSoon) {
          console.log('[Checkout Session] Permitindo renovação antecipada:', {
            planName: existingPlan?.name,
            expiresAt: existingSubscription?.expires_at,
          });
        } else if (isCancelled) {
          console.log('[Checkout Session] Permitindo reativação de assinatura cancelada:', {
            planName: existingPlan?.name,
          });
        } else {
          // Verificação final de segurança: garantir que não é Free plan antes de bloquear
          // Se o plan_id da assinatura for Free, permitir mesmo que outras verificações falharam
          if (subscriptionPlanId && (subscriptionPlanId === FREE_PLAN_ID || String(subscriptionPlanId) === String(FREE_PLAN_ID))) {
            console.log('[Checkout Session] ⚠️ Verificação de segurança: plan_id é Free, permitindo checkout mesmo após outras verificações:', {
              subscriptionPlanId,
              freePlanId: FREE_PLAN_ID,
            });
            // Continue to create checkout - don't block
          } else {
            // Block only if user has the same active paid plan and it's not expiring soon
            console.log('[Checkout Session] ❌ Bloqueando checkout - usuário já tem a mesma assinatura paga ativa:', {
              planName: existingPlan?.name,
              planPrice: existingPlan?.price,
              subscriptionPlanId,
              existingPlanId,
              expiresAt: existingSubscription?.expires_at,
            });
            return new Response(
              JSON.stringify({ 
                error: 'Você já possui uma assinatura ativa para este plano. Acesse a página de cobrança para gerenciar sua assinatura.',
                code: 'ALREADY_SUBSCRIBED'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
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

    // Prepare line items based on whether we have Stripe product/price IDs
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    if (plan.stripe_product_id && plan.stripe_price_id) {
      // Use existing Stripe Price ID if available
      lineItems = [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ]
    } else if (plan.stripe_product_id) {
      // Use Stripe Product ID but create price dynamically
      lineItems = [
        {
          price_data: {
            currency: 'brl',
            product: plan.stripe_product_id,
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: 'year',
            },
          },
          quantity: 1,
        },
      ]
    } else {
      // Create product and price dynamically (fallback)
      lineItems = [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: plan.name,
              description: plan.description || '',
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: 'year',
            },
          },
          quantity: 1,
        },
      ]
    }

    // Create Stripe checkout session
    let session;
    try {
      console.log('[Checkout Session] Criando sessão de checkout no Stripe:', {
        customerId,
        planId,
        lineItemsCount: lineItems.length,
      });
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card', 'apple_pay', 'link'],
        line_items: lineItems,
        mode: 'subscription',
        success_url: successUrl || `${siteUrl}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${siteUrl}/plans/cancel`,
        metadata: {
          user_id: userId,
          plan_id: planId,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            plan_id: planId,
          },
        },
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
      })
      console.log('[Checkout Session] Sessão de checkout criada com sucesso:', session.id);
    } catch (stripeError) {
      console.error('[Checkout Session] Erro ao criar sessão de checkout no Stripe:', stripeError);
      throw new Error(`Erro ao criar sessão de checkout: ${stripeError instanceof Error ? stripeError.message : 'Erro desconhecido'}`);
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
    console.error('[Checkout Session] ❌ Erro ao criar checkout session:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor ao processar checkout',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})












