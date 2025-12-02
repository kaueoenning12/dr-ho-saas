-- Add Stripe fields to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN payment_method TEXT;

-- Add indexes for better performance
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription_id ON public.user_subscriptions(stripe_subscription_id);

-- Add Stripe fields to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN stripe_product_id TEXT;

-- Add indexes for better performance
CREATE INDEX idx_subscription_plans_stripe_price_id ON public.subscription_plans(stripe_price_id);
CREATE INDEX idx_subscription_plans_stripe_product_id ON public.subscription_plans(stripe_product_id);

-- Create audit_logs table for tracking important actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs RLS policies
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Add indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.audit_logs IS 'Audit trail for tracking user actions and system events';
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';
COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS 'Stripe price ID for checkout sessions';
COMMENT ON COLUMN public.subscription_plans.stripe_product_id IS 'Stripe product ID for the subscription plan';












