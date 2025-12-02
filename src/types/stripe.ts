// Stripe Types
export interface StripeCheckoutSession {
  id: string;
  url: string;
  customer: string;
  subscription?: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
  default_source?: string;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  ended_at?: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
        recurring?: {
          interval: 'day' | 'week' | 'month' | 'year';
          interval_count: number;
        };
      };
    }>;
  };
}

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  due_date?: number;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

export interface StripePaymentMethod {
  id: string;
  type: 'card' | 'pix';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// API Response Types
export interface CreateCheckoutSessionRequest {
  planId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreateCustomerPortalRequest {
  userId: string;
  returnUrl?: string;
}

export interface CreateCustomerPortalResponse {
  url: string;
}

// Webhook Event Types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export type StripeWebhookEventType = 
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated';












