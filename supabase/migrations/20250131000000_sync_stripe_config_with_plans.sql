-- Migration to sync stripe_config default_product_id with subscription_plans
-- When default_product_id is updated in stripe_config, automatically update
-- subscription_plans that don't have a stripe_product_id configured

-- Create function to update plans when default_product_id changes
CREATE OR REPLACE FUNCTION sync_stripe_config_with_plans()
RETURNS TRIGGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Only proceed if default_product_id changed and is not NULL
  IF NEW.default_product_id IS NOT NULL 
     AND (OLD.default_product_id IS DISTINCT FROM NEW.default_product_id)
     AND NEW.is_active = true THEN
    
    -- Update all active plans that don't have stripe_product_id configured
    UPDATE public.subscription_plans
    SET 
      stripe_product_id = NEW.default_product_id,
      updated_at = now()
    WHERE 
      is_active = true
      AND (stripe_product_id IS NULL OR stripe_product_id = '');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the update (optional, can be removed if not needed)
    IF updated_count > 0 THEN
      RAISE NOTICE 'Updated % plan(s) with default_product_id: %', updated_count, NEW.default_product_id;
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
COMMENT ON FUNCTION sync_stripe_config_with_plans() IS 'Automatically updates subscription_plans.stripe_product_id when stripe_config.default_product_id is updated. Only updates plans that do not already have a stripe_product_id configured.';

