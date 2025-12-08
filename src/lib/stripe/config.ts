export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  productId: import.meta.env.VITE_STRIPE_PRODUCT_ID,
  apiVersion: '2024-12-18.acacia' as const,
  locale: 'pt-BR' as const,
  currency: 'BRL' as const,
  country: 'BR' as const,
} as const;

// Debug: Log configuration status in development
if (import.meta.env.DEV) {
  console.log('[Stripe Config] Status da configuração:', {
    hasPublishableKey: !!STRIPE_CONFIG.publishableKey,
    publishableKeyPrefix: STRIPE_CONFIG.publishableKey 
      ? STRIPE_CONFIG.publishableKey.substring(0, 20) + '...' 
      : 'não configurada',
    hasProductId: !!STRIPE_CONFIG.productId,
    productId: STRIPE_CONFIG.productId || 'não configurado',
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












