-- Migration to add plan reference and price_id to stripe_config
-- This allows selecting a specific plan and managing price_id from config

-- Add referenced_plan_id column to stripe_config
ALTER TABLE public.stripe_config
ADD COLUMN IF NOT EXISTS referenced_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- Add default_price_id column to stripe_config
ALTER TABLE public.stripe_config
ADD COLUMN IF NOT EXISTS default_price_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_config_referenced_plan_id 
ON public.stripe_config(referenced_plan_id) 
WHERE referenced_plan_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.stripe_config.referenced_plan_id IS 'Reference to the subscription plan this config applies to. If set, sync will only update this specific plan.';
COMMENT ON COLUMN public.stripe_config.default_price_id IS 'Default Stripe Price ID (price_...) - synced to subscription_plans.stripe_price_id when config is activated';

