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
export const redirectToCheckout = async (sessionId: string) => {
  const stripe = await getStripe();
  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    throw new Error(error.message || 'Failed to redirect to checkout');
  }
};

// Helper function to redirect to customer portal
export const redirectToCustomerPortal = async (sessionUrl: string) => {
  window.location.href = sessionUrl;
};












