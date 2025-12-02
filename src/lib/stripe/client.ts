import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from './config';

const publishableKey = STRIPE_CONFIG.publishableKey;

if (!publishableKey) {
  console.error(
    "[Stripe] Chave publishable não configurada. Defina VITE_STRIPE_PUBLISHABLE_KEY no arquivo de ambiente."
  );
}

// Initialize Stripe (lazy resolve to evitar erro quando chave não existe)
export const stripePromise: Promise<Stripe | null> = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

// Helper function to get Stripe instance
export const getStripe = async () => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error(
      'Stripe não foi inicializado. Verifique se VITE_STRIPE_PUBLISHABLE_KEY está configurada corretamente.'
    );
  }
  return stripe;
};

// Helper function to redirect to checkout
// Accepts a full checkout URL from Stripe
export const redirectToCheckout = async (checkoutUrl: string) => {
  // Always use full URL from Stripe checkout session
  if (!checkoutUrl.startsWith('http://') && !checkoutUrl.startsWith('https://')) {
    throw new Error('URL de checkout inválida. Deve ser uma URL completa do Stripe.');
  }

  console.log('[Stripe] Redirecionando para checkout usando URL completa');
  window.location.href = checkoutUrl;
};

// Helper function to redirect to customer portal
export const redirectToCustomerPortal = async (sessionUrl: string) => {
  window.location.href = sessionUrl;
};












