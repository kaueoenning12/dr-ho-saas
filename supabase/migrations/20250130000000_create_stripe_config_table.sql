-- Create stripe_config table for managing Stripe API keys and configuration
-- This allows managing Stripe settings via admin UI instead of .env files

CREATE TABLE IF NOT EXISTS public.stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  publishable_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  webhook_secret TEXT,
  default_product_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(environment)
);

-- Enable RLS on stripe_config
ALTER TABLE public.stripe_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_config
-- Only admins can view and manage Stripe configuration
CREATE POLICY "Admins can view stripe config"
  ON public.stripe_config FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage stripe config"
  ON public.stripe_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_config_environment ON public.stripe_config(environment);
CREATE INDEX IF NOT EXISTS idx_stripe_config_is_active ON public.stripe_config(is_active) WHERE is_active = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_config_updated_at
  BEFORE UPDATE ON public.stripe_config
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_config_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.stripe_config IS 'Stores Stripe API configuration (keys, secrets) for test and live environments';
COMMENT ON COLUMN public.stripe_config.environment IS 'Environment: test or live';
COMMENT ON COLUMN public.stripe_config.publishable_key IS 'Stripe publishable key (pk_test_... or pk_live_...)';
COMMENT ON COLUMN public.stripe_config.secret_key IS 'Stripe secret key (sk_test_... or sk_live_...)';
COMMENT ON COLUMN public.stripe_config.webhook_secret IS 'Stripe webhook secret (whsec_...)';
COMMENT ON COLUMN public.stripe_config.default_product_id IS 'Default Stripe Product ID (prod_...) - used as fallback if plan does not have stripe_product_id';
COMMENT ON COLUMN public.stripe_config.is_active IS 'Indicates which environment is currently active';

