export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  productId: import.meta.env.VITE_STRIPE_PRODUCT_ID,
  apiVersion: '2024-12-18.acacia' as const,
  locale: 'pt-BR' as const,
  currency: 'BRL' as const,
  country: 'BR' as const,
} as const;

export const STRIPE_CHECKOUT_CONFIG = {
  mode: 'subscription' as const,
  paymentMethodTypes: ['card', 'apple_pay', 'link'] as const,
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












