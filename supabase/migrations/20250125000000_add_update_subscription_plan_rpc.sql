-- Create RPC function to update subscription plan_id
-- This allows users to update their own subscription plan_id after checkout
CREATE OR REPLACE FUNCTION public.update_user_subscription_plan(
  p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate plan_id exists
  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans WHERE id = p_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END IF;

  -- Update subscription plan_id
  UPDATE public.user_subscriptions
  SET 
    plan_id = p_plan_id,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- If no row was updated, create a new subscription
  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_id,
      status,
      started_at
    )
    VALUES (
      v_user_id,
      p_plan_id,
      'active',
      NOW()
    );
  END IF;

  -- Return updated subscription
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'plan_id', plan_id,
    'status', status,
    'updated_at', updated_at
  )
  INTO v_result
  FROM public.user_subscriptions
  WHERE user_id = v_user_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_subscription_plan(UUID) TO authenticated;

-- Add RLS policy to allow users to update their own subscription
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

