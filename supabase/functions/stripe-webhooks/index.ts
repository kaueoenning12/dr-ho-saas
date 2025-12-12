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
    // Initialize Supabase client first to get config
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Stripe secret key and webhook secret from Supabase (stripe_config table)
    // Fallback to Deno.env for backward compatibility
    let stripeSecretKey = '';
    let webhookSecret = '';

    try {
      // Try to get active Stripe config from Supabase
      const { data: stripeConfig, error: configError } = await supabase
        .from('stripe_config')
        .select('secret_key, webhook_secret')
        .eq('is_active', true)
        .maybeSingle();

      if (!configError && stripeConfig) {
        stripeSecretKey = stripeConfig.secret_key || '';
        webhookSecret = stripeConfig.webhook_secret || '';
        console.log('[Webhooks] Usando configurações do Supabase (stripe_config)');
      } else {
        // Fallback to Deno.env
        stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
        webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
        if (stripeSecretKey) {
          console.warn('[Webhooks] Usando configurações do fallback (Deno.env)');
        }
      }
    } catch (error) {
      console.warn('[Webhooks] Erro ao buscar config do Supabase, usando fallback:', error);
      stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
      webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    }

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response('Stripe secret key not configured', { status: 500 })
    }

    // Supabase client already initialized above - remove duplicate declaration

    // Get the webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    // Get the raw body
    const body = await req.text()
    
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

    console.log('[Webhook] ========================================')
    console.log('[Webhook] Event received:', event.type)
    console.log('[Webhook] Event ID:', event.id)
    console.log('[Webhook] Event created:', new Date(event.created * 1000).toISOString())
    console.log('[Webhook] ========================================')

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(supabase, stripe, session)
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
    console.error('[Webhook] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Helper function to get plan_id from subscription metadata
 * Tries subscription metadata first, then falls back to existing plan_id in database
 */
async function getPlanIdFromSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
  existingPlanId?: string
): Promise<string | null> {
  // Try to get plan_id from subscription metadata
  const planIdFromMetadata = subscription.metadata?.plan_id
  
  if (planIdFromMetadata) {
    console.log('[Webhook] Found plan_id in subscription metadata:', planIdFromMetadata)
    return planIdFromMetadata
  }

  // Fallback to existing plan_id if provided
  if (existingPlanId) {
    console.log('[Webhook] Using existing plan_id as fallback:', existingPlanId)
    return existingPlanId
  }

  console.warn('[Webhook] No plan_id found in subscription metadata or existing subscription')
  return null
}

/**
 * Validate if plan_id exists in subscription_plans table
 */
async function validatePlanId(supabase: any, planId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .eq('id', planId)
    .single()

  if (error || !data) {
    console.error('[Webhook] Plan ID validation failed:', {
      planId,
      error: error?.message,
    })
    return false
  }

  console.log('[Webhook] Plan ID validated successfully:', {
    planId,
    planName: data.name,
  })
  return true
}

async function handleCheckoutSessionCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  
  console.log('[Webhook] Processing checkout.session.completed:', {
    sessionId: session.id,
    userId,
    planId,
    customerId: session.customer,
    subscriptionId: session.subscription,
    allMetadata: session.metadata,
  })

  if (!userId || !planId) {
    console.error('[Webhook] Missing metadata in checkout session:', {
      sessionId: session.id,
      hasUserId: !!userId,
      hasPlanId: !!planId,
      metadata: session.metadata,
    })
    return
  }

  // Validate plan_id exists in database
  const isValidPlan = await validatePlanId(supabase, planId)
  if (!isValidPlan) {
    console.error('[Webhook] Invalid plan_id, cannot proceed:', planId)
    return
  }

  // Get the subscription ID from session
  const subscriptionId = typeof session.subscription === 'string' 
    ? session.subscription 
    : session.subscription?.id

  if (!subscriptionId) {
    console.error('[Webhook] No subscription found in checkout session:', session.id)
    return
  }

  // Fetch the full subscription object from Stripe to get accurate data
  let subscription: Stripe.Subscription
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId)
    console.log('[Webhook] Retrieved subscription from Stripe:', {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      customerId: subscription.customer,
      metadata: subscription.metadata,
    })
  } catch (error) {
    console.error('[Webhook] Error retrieving subscription from Stripe:', error)
    return
  }

  // Map Stripe status to database status
  const status = mapStripeStatusToDb(subscription.status)
  
  // Get customer ID
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id || typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id

  if (!customerId) {
    console.error('[Webhook] No customer ID found in session or subscription')
    return
  }

  // Use plan_id from session metadata (already validated)
  // This ensures we use the correct plan_id from the checkout
  const finalPlanId = planId

  console.log('[Webhook] Processing subscription update/creation with plan_id:', {
    userId,
    planId: finalPlanId,
    subscriptionId,
    status,
    customerId,
  })

  // Check if subscription already exists
  const { data: existingSubscription, error: findError } = await supabase
    .from('user_subscriptions')
    .select('id, plan_id, status, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('[Webhook] Error checking existing subscription:', findError)
    return
  }

  // Calculate started_at
  const startedAt = subscription.current_period_start 
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString()

  // Calculate expires_at: always 1 year from started_at
  // If it's a renewal (existing subscription), add 1 year from current date
  const currentTime = new Date()
  let expiresAt: string
  
  if (existingSubscription) {
    // Renewal: add 1 year from current date
    const oneYearFromNow = new Date(currentTime.getTime() + 365 * 24 * 60 * 60 * 1000)
    expiresAt = oneYearFromNow.toISOString()
    console.log('[Webhook] Renewal detected - setting expires_at to 1 year from now:', expiresAt)
  } else {
    // New subscription: add 1 year from started_at
    const startedAtDate = new Date(startedAt)
    const oneYearFromStart = new Date(startedAtDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    expiresAt = oneYearFromStart.toISOString()
    console.log('[Webhook] New subscription - setting expires_at to 1 year from started_at:', expiresAt)
  }

  const subscriptionData = {
    user_id: userId,
    plan_id: finalPlanId, // Always use the plan_id from checkout
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status: status,
    started_at: startedAt,
    expires_at: expiresAt,
  }

  let updatedData: any = null
  let updateError: any = null

  if (existingSubscription) {
    // Subscription exists - use UPDATE to ensure plan_id is always updated
    console.log('[Webhook] Subscription exists, updating with plan_id:', {
      existingPlanId: existingSubscription.plan_id,
      newPlanId: finalPlanId,
      subscriptionId: existingSubscription.id,
    })

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId)
      .select()

    updatedData = data
    updateError = error
  } else {
    // New subscription - use INSERT
    console.log('[Webhook] Creating new subscription with plan_id:', finalPlanId)

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select()

    updatedData = data
    updateError = error
  }

  if (updateError) {
    console.error('[Webhook] Error updating/creating subscription:', {
      error: updateError,
      userId,
      planId: finalPlanId,
      existingSubscription: !!existingSubscription,
    })
    return
  }

  console.log('[Webhook] Subscription updated/created successfully:', {
    userId,
    planId: finalPlanId,
    subscriptionId,
    status,
    expiresAt,
    updatedData: updatedData?.[0],
  })

  // Check if subscription is expired and update status if needed
  const currentTimeCheck = new Date()
  const expiresAtDate = new Date(expiresAt)
  if (expiresAtDate < currentTimeCheck && status === 'active') {
    console.log('[Webhook] Subscription has expired, updating status to expired')
    const { error: expireError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', userId)
    
    if (expireError) {
      console.error('[Webhook] Error updating subscription status to expired:', expireError)
    } else {
      console.log('[Webhook] Subscription status updated to expired')
    }
  }

  // Verify the plan_id was saved correctly
  const savedPlanId = updatedData?.[0]?.plan_id
  if (savedPlanId !== finalPlanId) {
    console.error('[Webhook] WARNING: plan_id mismatch after update:', {
      expected: finalPlanId,
      actual: savedPlanId,
    })
    
    // Retry: Force update plan_id explicitly
    console.log('[Webhook] Retrying to update plan_id...')
    const { data: retryData, error: retryError } = await supabase
      .from('user_subscriptions')
      .update({ plan_id: finalPlanId })
      .eq('user_id', userId)
      .select()

    if (retryError) {
      console.error('[Webhook] Error in retry update:', retryError)
    } else {
      console.log('[Webhook] Retry successful, plan_id updated:', {
        planId: retryData?.[0]?.plan_id,
      })
    }
  } else {
    console.log('[Webhook] ✅ plan_id verified correctly:', savedPlanId)
  }

  // Try to log the audit event (ignore errors if function doesn't exist)
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'subscription_created',
      p_resource_type: 'subscription',
      p_resource_id: subscriptionId,
      p_details: {
        plan_id: finalPlanId,
        amount: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        stripe_status: subscription.status,
      },
    })
  } catch (auditError) {
    // Log audit errors but don't fail the webhook
    console.warn('[Webhook] Could not log audit event (function may not exist):', auditError)
  }

  // Send webhook notification if subscription is confirmed/paid
  // Always send webhook when checkout session is completed with paid status
  // or when subscription is active/trialing (paid subscription)
  const isPaidSubscription = session.payment_status === 'paid' || 
                              subscription.status === 'active' || 
                              subscription.status === 'trialing'
  
  const wasNewSubscription = !existingSubscription
  const isActiveStatus = status === 'active'
  
  // Send webhook if:
  // 1. Payment was successful (paid) OR subscription is active/trialing
  // 2. AND status is active (subscription confirmed)
  // Always send for new subscriptions that are paid, or when status becomes active
  const shouldSendWebhook = (isPaidSubscription && isActiveStatus) || 
                            (wasNewSubscription && session.payment_status === 'paid')
  
  console.log('[Webhook] Checking if webhook should be sent:', {
    shouldSendWebhook,
    isPaidSubscription,
    wasNewSubscription,
    isActiveStatus,
    paymentStatus: session.payment_status,
    subscriptionStatus: subscription.status,
    dbStatus: status,
  })

  if (shouldSendWebhook) {
    try {
      console.log('[Webhook] 📤 Sending subscription webhook notification...')
      
      // Get user phone number from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('number')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.warn('[Webhook] Could not fetch user phone number:', profileError)
      }

      await sendSubscriptionWebhook(userId, profile?.number || null)
      console.log('[Webhook] ✅ Subscription webhook notification sent successfully')
    } catch (webhookError) {
      // Log error but don't fail the webhook processing
      console.error('[Webhook] ❌ Error sending subscription webhook:', webhookError)
    }
  } else {
    console.log('[Webhook] ⚠️ Webhook not sent - conditions not met:', {
      isPaidSubscription,
      wasNewSubscription,
      isActiveStatus,
      paymentStatus: session.payment_status,
      subscriptionStatus: subscription.status,
      dbStatus: status,
    })
  }

  console.log('[Webhook] Checkout session completed successfully for user:', userId)
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id

  if (!customerId) {
    console.error('[Webhook] No customer ID in subscription:', subscription.id)
    return
  }

  console.log('[Webhook] Processing subscription update:', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    metadata: subscription.metadata,
  })
  
  // Find user by Stripe customer ID
  const { data: userSub, error: findError } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_id, status')
    .eq('stripe_customer_id', customerId)
    .single()

  if (findError || !userSub) {
    console.error('[Webhook] User not found for customer:', customerId, findError)
    return
  }

  // Store previous status to check if subscription was just activated
  const previousStatus = userSub.status

  // Get plan_id from subscription metadata
  // IMPORTANT: Always prioritize plan_id from subscription metadata if available
  const planIdFromMetadata = subscription.metadata?.plan_id
  
  // Determine final plan_id to use
  let finalPlanId = userSub.plan_id // Default to existing plan_id
  
  if (planIdFromMetadata) {
    // Validate plan_id from metadata
    const isValidPlan = await validatePlanId(supabase, planIdFromMetadata)
    if (isValidPlan) {
      finalPlanId = planIdFromMetadata
      console.log('[Webhook] Using plan_id from subscription metadata:', {
        planId: finalPlanId,
        previousPlanId: userSub.plan_id,
      })
    } else {
      console.warn('[Webhook] Invalid plan_id from metadata, preserving existing plan_id:', {
        invalidPlanId: planIdFromMetadata,
        existingPlanId: userSub.plan_id,
      })
    }
  } else {
    console.log('[Webhook] No plan_id in subscription metadata, preserving existing plan_id:', {
      existingPlanId: userSub.plan_id,
      subscriptionMetadata: subscription.metadata,
    })
  }

  // Update subscription status
  const status = mapStripeStatusToDb(subscription.status)
  
  // Calculate started_at
  const startedAt = subscription.current_period_start 
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString()

  // Calculate expires_at: always 1 year from started_at
  // If subscription is being renewed (status is active and we're updating), add 1 year from current date
  const currentTimeUpdate = new Date()
  let expiresAt: string
  
  // Check if this is a renewal (status is active and subscription exists)
  if (status === 'active' && previousStatus === 'active') {
    // Renewal: add 1 year from current date
    const oneYearFromNow = new Date(currentTimeUpdate.getTime() + 365 * 24 * 60 * 60 * 1000)
    expiresAt = oneYearFromNow.toISOString()
    console.log('[Webhook] Renewal detected in subscription update - setting expires_at to 1 year from now:', expiresAt)
  } else {
    // New subscription or status change: add 1 year from started_at
    const startedAtDate = new Date(startedAt)
    const oneYearFromStart = new Date(startedAtDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    expiresAt = oneYearFromStart.toISOString()
    console.log('[Webhook] Setting expires_at to 1 year from started_at:', expiresAt)
  }

  const updateData: any = {
    stripe_subscription_id: subscription.id,
    status: status,
    plan_id: finalPlanId, // Always update plan_id to ensure it's correct
    started_at: startedAt,
    expires_at: expiresAt,
  }

  console.log('[Webhook] Updating subscription with data:', {
    userId: userSub.user_id,
    planId: finalPlanId,
    status,
    expiresAt,
  })

  const { data: updatedData, error: updateError } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('user_id', userSub.user_id)
    .select()

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', updateError)
    return
  }

  console.log('[Webhook] Subscription updated successfully:', {
    userId: userSub.user_id,
    subscriptionId: subscription.id,
    planId: finalPlanId,
    status,
    expiresAt,
    updatedData: updatedData?.[0],
  })

  // Check if subscription is expired and update status if needed
  const currentTimeExpireCheck = new Date()
  const expiresAtDate = new Date(expiresAt)
  if (expiresAtDate < currentTimeExpireCheck && status === 'active') {
    console.log('[Webhook] Subscription has expired, updating status to expired')
    const { error: expireError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', userSub.user_id)
    
    if (expireError) {
      console.error('[Webhook] Error updating subscription status to expired:', expireError)
    } else {
      console.log('[Webhook] Subscription status updated to expired')
    }
  }

  // Verify the plan_id was updated correctly
  const savedPlanId = updatedData?.[0]?.plan_id
  if (savedPlanId !== finalPlanId) {
    console.error('[Webhook] WARNING: plan_id mismatch after update:', {
      expected: finalPlanId,
      actual: savedPlanId,
    })
    
    // Retry: Force update plan_id explicitly
    console.log('[Webhook] Retrying to update plan_id in subscription update...')
    const { data: retryData, error: retryError } = await supabase
      .from('user_subscriptions')
      .update({ plan_id: finalPlanId })
      .eq('user_id', userSub.user_id)
      .select()

    if (retryError) {
      console.error('[Webhook] Error in retry update:', retryError)
    } else {
      console.log('[Webhook] Retry successful, plan_id updated:', {
        planId: retryData?.[0]?.plan_id,
      })
    }
  } else {
    console.log('[Webhook] ✅ plan_id verified correctly in subscription update:', savedPlanId)
  }

  // Try to log the audit event (ignore errors if function doesn't exist)
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'subscription_updated',
      p_resource_type: 'subscription',
      p_resource_id: subscription.id,
      p_details: {
        plan_id: finalPlanId,
        status: status,
        current_period_end: expiresAt,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    })
  } catch (auditError) {
    console.warn('[Webhook] Could not log audit event (function may not exist):', auditError)
  }

  // Send webhook notification if subscription was just activated (status changed to active)
  const statusChangedToActive = status === 'active' && previousStatus !== 'active'
  const isActiveSubscription = status === 'active' && (subscription.status === 'active' || subscription.status === 'trialing')
  
  console.log('[Webhook] Checking if webhook should be sent (subscription update):', {
    statusChangedToActive,
    isActiveSubscription,
    previousStatus,
    currentStatus: status,
    stripeStatus: subscription.status,
  })

  if (statusChangedToActive || isActiveSubscription) {
    try {
      console.log('[Webhook] Sending subscription webhook notification (subscription updated)...')
      
      // Get user phone number from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('number')
        .eq('user_id', userSub.user_id)
        .single()

      if (profileError) {
        console.warn('[Webhook] Could not fetch user phone number:', profileError)
      }

      await sendSubscriptionWebhook(userSub.user_id, profile?.number || null)
      console.log('[Webhook] ✅ Subscription webhook notification sent successfully (subscription updated)')
    } catch (webhookError) {
      // Log error but don't fail the webhook processing
      console.error('[Webhook] ❌ Error sending subscription webhook:', webhookError)
    }
  } else {
    console.log('[Webhook] Webhook not sent - subscription update conditions not met')
  }
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

  // Update subscription status to inactive (past_due not supported in table)
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'inactive',
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

/**
 * Send webhook notification to external service when subscription is confirmed
 */
async function sendSubscriptionWebhook(userId: string, phoneNumber: string | null) {
  const webhookUrl = 'https://webhook.gruponexusmind.com.br/webhook/nova_assinatura'
  
  try {
    const payload = {
      user_id: userId,
      telefone: phoneNumber || null,
      timestamp: new Date().toISOString(),
    }

    console.log('[Webhook] 📤 Sending subscription notification to external webhook:', {
      url: webhookUrl,
      userId,
      hasPhone: !!phoneNumber,
      phoneNumber: phoneNumber || 'null',
      payload: JSON.stringify(payload),
    })

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dr-HO-SaaS/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let responseText = ''
      try {
        responseText = await response.text()
      } catch (e) {
        console.warn('[Webhook] Could not read response body:', e)
      }

      console.log('[Webhook] Response from external webhook:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText.substring(0, 500), // Limit response body log
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        console.error('[Webhook] ❌ External webhook returned error:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText.substring(0, 500),
        })
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
      } else {
        console.log('[Webhook] ✅ External webhook notification sent successfully')
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[Webhook] ❌ Request timeout after 30 seconds')
        throw new Error('Webhook request timeout')
      }
      throw fetchError
    }
  } catch (error) {
    // Log error but don't fail the webhook processing
    console.error('[Webhook] ❌ Error sending external webhook notification:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      webhookUrl,
    })
    throw error // Re-throw para que o chamador possa ver o erro nos logs
  }
}

function mapStripeStatusToDb(stripeStatus: string): string {
  // Map Stripe status to database status
  // Database only accepts: 'active', 'inactive', 'cancelled', 'expired'
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      // Map past_due/unpaid to inactive (table doesn't support past_due)
      return 'inactive'
    case 'canceled':
    case 'cancelled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive'
    case 'unpaid':
      return 'inactive'
    default:
      console.warn(`[Webhook] Unknown Stripe status: ${stripeStatus}, mapping to inactive`)
      return 'inactive'
  }
}












