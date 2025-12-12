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
    const body = await req.json()
    const { userId, returnUrl, _siteUrl } = body

    // Initialize Supabase client FIRST
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe secret key from Supabase (stripe_config table)
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
        console.log('[Customer Portal] ✅ Usando secret_key do Supabase (stripe_config)');
      } else {
        console.error('[Customer Portal] ❌ Nenhuma secret_key encontrada no banco de dados');
        stripeSecretKey = '';
      }
    } catch (error) {
      console.error('[Customer Portal] ❌ Erro ao buscar config do Supabase:', error);
      stripeSecretKey = '';
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Stripe secret key not configured',
          details: 'Configure a secret_key na tabela stripe_config do Supabase'
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

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's subscription to find Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found for user' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${siteUrl}/settings`,
    })

    console.log('[Customer Portal] ✅ Portal session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Customer Portal] Error creating customer portal session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
