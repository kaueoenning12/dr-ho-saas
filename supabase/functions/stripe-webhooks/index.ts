import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

    // Get the webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    // Get the raw body
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      return new Response('Missing webhook secret', { status: 500 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Processing webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(supabase, session)
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(supabase, subscription)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(supabase, invoice)
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 500 })
  }
})

async function handleCheckoutSessionCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  
  if (!userId || !planId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Get the subscription from Stripe
  const subscription = session.subscription as string
  if (!subscription) {
    console.error('No subscription found in checkout session:', session.id)
    return
  }

  // Update or create user subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    })

  if (error) {
    console.error('Error updating subscription:', error)
    return
  }

  // Log the successful payment
  await supabase.rpc('log_audit_event', {
    p_action: 'subscription_created',
    p_resource_type: 'subscription',
    p_resource_id: subscription,
    p_details: {
      plan_id: planId,
      amount: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
    },
  })

  console.log('Checkout session completed for user:', userId)
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID
  const { data: userSub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userSub) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription status
  const status = mapStripeStatusToDb(subscription.status)
  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: status,
      expires_at: expiresAt,
    })
    .eq('user_id', userSub.user_id)

  if (error) {
    console.error('Error updating subscription:', error)
    return
  }

  // Log the subscription update
  await supabase.rpc('log_audit_event', {
    p_action: 'subscription_updated',
    p_resource_type: 'subscription',
    p_resource_id: subscription.id,
    p_details: {
      status: status,
      current_period_end: expiresAt,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  })

  console.log('Subscription updated:', subscription.id)
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID
  const { data: userSub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userSub) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription status to cancelled
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      expires_at: new Date(subscription.ended_at! * 1000).toISOString(),
    })
    .eq('user_id', userSub.user_id)

  if (error) {
    console.error('Error cancelling subscription:', error)
    return
  }

  // Log the subscription cancellation
  await supabase.rpc('log_audit_event', {
    p_action: 'subscription_cancelled',
    p_resource_type: 'subscription',
    p_resource_id: subscription.id,
    p_details: {
      cancelled_at: new Date(subscription.canceled_at! * 1000).toISOString(),
      ended_at: new Date(subscription.ended_at! * 1000).toISOString(),
    },
  })

  console.log('Subscription cancelled:', subscription.id)
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) {
    console.log('Invoice is not for a subscription:', invoice.id)
    return
  }

  // Find user by Stripe customer ID
  const { data: userSub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userSub) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Log the successful payment
  await supabase.rpc('log_audit_event', {
    p_action: 'payment_succeeded',
    p_resource_type: 'payment',
    p_resource_id: invoice.id,
    p_details: {
      amount: invoice.amount_paid,
      currency: invoice.currency,
      subscription_id: subscriptionId,
    },
  })

  console.log('Payment succeeded for user:', userSub.user_id)
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) {
    console.log('Invoice is not for a subscription:', invoice.id)
    return
  }

  // Find user by Stripe customer ID
  const { data: userSub } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!userSub) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('user_id', userSub.user_id)

  if (error) {
    console.error('Error updating subscription status:', error)
    return
  }

  // Log the failed payment
  await supabase.rpc('log_audit_event', {
    p_action: 'payment_failed',
    p_resource_type: 'payment',
    p_resource_id: invoice.id,
    p_details: {
      amount: invoice.amount_due,
      currency: invoice.currency,
      subscription_id: subscriptionId,
      failure_reason: invoice.last_finalization_error?.message,
    },
  })

  console.log('Payment failed for user:', userSub.user_id)
}

function mapStripeStatusToDb(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive'
    case 'trialing':
      return 'active'
    case 'unpaid':
      return 'past_due'
    default:
      return 'inactive'
  }
}












