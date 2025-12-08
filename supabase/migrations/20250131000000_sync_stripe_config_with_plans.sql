-- Migration to sync stripe_config with subscription_plans
-- When default_product_id or default_price_id is updated in stripe_config, automatically update
-- the referenced plan (only if a plan is explicitly referenced)

-- Create function to update plans when config changes
CREATE OR REPLACE FUNCTION sync_stripe_config_with_plans()
RETURNS TRIGGER AS $$
DECLARE
  updated_count INTEGER;
  should_sync BOOLEAN := false;
  product_id_changed BOOLEAN := false;
  price_id_changed BOOLEAN := false;
  is_activating BOOLEAN := false;
BEGIN
  -- Check if we should sync:
  -- 1. Config is being activated (is_active changed from false to true)
  -- 2. Product ID changed
  -- 3. Price ID changed
  is_activating := NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL);
  product_id_changed := NEW.default_product_id IS NOT NULL 
    AND (OLD.default_product_id IS DISTINCT FROM NEW.default_product_id);
  price_id_changed := NEW.default_price_id IS NOT NULL 
    AND (OLD.default_price_id IS DISTINCT FROM NEW.default_price_id);
  
  should_sync := NEW.is_active = true AND (is_activating OR product_id_changed OR price_id_changed);
  
  -- Only sync if a plan is explicitly referenced
  IF should_sync AND NEW.referenced_plan_id IS NOT NULL THEN
    UPDATE public.subscription_plans
    SET 
      stripe_product_id = COALESCE(NEW.default_product_id, stripe_product_id),
      stripe_price_id = COALESCE(NEW.default_price_id, stripe_price_id),
      updated_at = now()
    WHERE 
      id = NEW.referenced_plan_id
      AND is_active = true;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
      RAISE NOTICE 'Updated referenced plan % with product_id: %, price_id: %', 
        NEW.referenced_plan_id, 
        NEW.default_product_id, 
        NEW.default_price_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute the function after update on stripe_config
DROP TRIGGER IF EXISTS trigger_sync_stripe_config_with_plans ON public.stripe_config;

CREATE TRIGGER trigger_sync_stripe_config_with_plans
  AFTER UPDATE ON public.stripe_config
  FOR EACH ROW
  EXECUTE FUNCTION sync_stripe_config_with_plans();

-- Add comment for documentation
COMMENT ON FUNCTION sync_stripe_config_with_plans() IS 'Automatically syncs stripe_config.default_product_id and default_price_id to subscription_plans. Only syncs if referenced_plan_id is set - if no plan is referenced, no synchronization occurs. Syncs when config is activated or when product_id/price_id changes.';

