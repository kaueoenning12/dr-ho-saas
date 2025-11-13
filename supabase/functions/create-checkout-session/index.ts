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
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { planId, userId, successUrl, cancelUrl } = await req.json()

    if (!planId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: planId, userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ error: 'User already has an active subscription' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or get Stripe customer
    let customerId = existingSubscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.name,
        metadata: {
          user_id: userId,
        },
      })
      customerId = customer.id
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'pix'],
      line_items: [
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
      ],
      mode: 'subscription',
      success_url: successUrl || `${Deno.env.get('SITE_URL')}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${Deno.env.get('SITE_URL')}/plans/cancel`,
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

    // Log the checkout session creation
    await supabase.rpc('log_audit_event', {
      p_action: 'checkout_session_created',
      p_resource_type: 'subscription',
      p_resource_id: session.id,
      p_details: {
        plan_id,
        plan_name: plan.name,
        amount: plan.price,
        currency: 'BRL',
      },
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
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})












