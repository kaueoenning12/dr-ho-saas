import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json()
    const { sessionId, _stripeSecretKey } = body

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe secret key from Supabase (stripe_config table)
    // Fallback to request body or Deno.env for backward compatibility
    let stripeSecretKey = '';

    try {
      // Try to get active Stripe config from Supabase
      const { data: stripeConfig, error: configError } = await supabase
        .from('stripe_config')
        .select('secret_key')
        .eq('is_active', true)
        .maybeSingle();

      if (!configError && stripeConfig?.secret_key) {
        stripeSecretKey = stripeConfig.secret_key;
        console.log('[Update Subscription Plan] Usando secret_key do Supabase (stripe_config)');
      } else {
        // Fallback to request body or Deno.env
        stripeSecretKey = _stripeSecretKey || Deno.env.get('STRIPE_SECRET_KEY') || '';
        if (stripeSecretKey) {
          console.warn('[Update Subscription Plan] Usando secret_key do fallback (.env ou request body)');
        }
      }
    } catch (error) {
      console.warn('[Update Subscription Plan] Erro ao buscar config do Supabase, usando fallback:', error);
      stripeSecretKey = _stripeSecretKey || Deno.env.get('STRIPE_SECRET_KEY') || '';
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Stripe secret key not configured',
          details: 'Configure a secret_key na tabela stripe_config do Supabase ou use variável de ambiente STRIPE_SECRET_KEY'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })

    console.log('[Update Subscription Plan] Fetching session from Stripe:', sessionId)

    // Fetch checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    console.log('[Update Subscription Plan] Session retrieved:', {
      sessionId: session.id,
      userId: session.metadata?.user_id,
      planId: session.metadata?.plan_id,
      subscriptionId: session.subscription,
    })

    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id

    if (!userId || !planId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing metadata in session',
          metadata: session.metadata 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate plan_id exists
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan_id', planId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get subscription ID
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as any)?.id

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'No subscription found in session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch subscription from Stripe to get accurate data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as any)?.id

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'No customer ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update subscription in database
    const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive'
    const expiresAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    console.log('[Update Subscription Plan] Updating subscription:', {
      userId,
      planId,
      subscriptionId,
      status,
      expiresAt,
    })

    const { data: updatedData, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: status,
        started_at: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq('user_id', userId)
      .select()

    if (updateError) {
      console.error('[Update Subscription Plan] Error updating subscription:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Update Subscription Plan] Subscription updated successfully:', {
      userId,
      planId: updatedData?.[0]?.plan_id,
      status: updatedData?.[0]?.status,
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: updatedData?.[0],
        planId,
        planName: plan.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Update Subscription Plan] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

