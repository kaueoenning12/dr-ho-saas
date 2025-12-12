-- Migration to add logic for expires_at calculation and expiration checking
-- This ensures subscriptions always have expires_at set to 1 year from started_at
-- and automatically marks subscriptions as expired when expires_at < now()

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION public.check_and_update_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update subscriptions where expires_at has passed and status is still 'active'
  UPDATE public.user_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.check_and_update_expired_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_update_expired_subscriptions() TO service_role;

-- Create a trigger function to automatically set expires_at when started_at is set
-- This ensures expires_at is always 1 year from started_at
CREATE OR REPLACE FUNCTION public.set_expires_at_from_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only set expires_at if:
  -- 1. started_at is being set/changed
  -- 2. expires_at is NULL or is being explicitly set to NULL
  -- 3. Don't override if expires_at is being explicitly set (not NULL)
  
  IF NEW.started_at IS NOT NULL AND (NEW.expires_at IS NULL OR TG_OP = 'INSERT') THEN
    -- Set expires_at to 1 year from started_at
    NEW.expires_at := NEW.started_at + INTERVAL '1 year';
  END IF;
  
  -- If expires_at is set but started_at is not, set started_at to now
  IF NEW.expires_at IS NOT NULL AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set expires_at when started_at is set
DROP TRIGGER IF EXISTS trigger_set_expires_at_from_started_at ON public.user_subscriptions;

CREATE TRIGGER trigger_set_expires_at_from_started_at
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expires_at_from_started_at();

-- Add comment explaining the expires_at logic
COMMENT ON COLUMN public.user_subscriptions.expires_at IS 
  'Data de expiração da assinatura. Sempre deve ser 1 ano a partir de started_at. Se expires_at < NOW(), a assinatura é considerada expirada e o usuário está sem plano.';




