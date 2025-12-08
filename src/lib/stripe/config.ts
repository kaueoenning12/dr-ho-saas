// Stripe configuration - will be loaded from Supabase
// Fallback to .env for backward compatibility during migration
export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, // Fallback
  productId: import.meta.env.VITE_STRIPE_PRODUCT_ID, // Fallback - will be removed, using plan-specific IDs
  apiVersion: '2024-12-18.acacia' as const,
  locale: 'pt-BR' as const,
  currency: 'BRL' as const,
  country: 'BR' as const,
} as const;

// Function to get publishable key from Supabase (async)
// This will be used by components that need the key
export async function getStripePublishableKey(): Promise<string | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from("stripe_config")
      .select("publishable_key")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn('[Stripe Config] Erro ao buscar publishable_key do Supabase:', error);
      // Fallback to .env
      return STRIPE_CONFIG.publishableKey || null;
    }

    return data?.publishable_key || STRIPE_CONFIG.publishableKey || null;
  } catch (error) {
    console.warn('[Stripe Config] Erro ao buscar publishable_key:', error);
    // Fallback to .env
    return STRIPE_CONFIG.publishableKey || null;
  }
}

// Debug: Log configuration status in development
if (import.meta.env.DEV) {
  console.log('[Stripe Config] Status da configuração:', {
    hasPublishableKey: !!STRIPE_CONFIG.publishableKey,
    publishableKeyPrefix: STRIPE_CONFIG.publishableKey 
      ? STRIPE_CONFIG.publishableKey.substring(0, 20) + '...' 
      : 'não configurada',
    hasProductId: !!STRIPE_CONFIG.productId,
    productId: STRIPE_CONFIG.productId || 'não configurado',
    note: 'Configurações serão carregadas do Supabase quando disponíveis',
  });
}

export const STRIPE_CHECKOUT_CONFIG = {
  mode: 'subscription' as const,
  paymentMethodTypes: ['card'] as const,
  successUrl: `${window.location.origin}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${window.location.origin}/plans/cancel`,
  billingAddressCollection: 'required' as const,
  customerUpdate: {
    address: 'auto',
    name: 'auto',
  },
} as const;

export const STRIPE_CUSTOMER_PORTAL_CONFIG = {
  returnUrl: `${window.location.origin}/settings`,
} as const;












