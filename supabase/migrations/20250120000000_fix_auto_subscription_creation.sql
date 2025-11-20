-- Fix automatic subscription creation for new users
-- This migration ensures subscriptions are created automatically with the fixed Free plan ID

-- 1. Update trigger function to use fixed Free plan ID and handle conflicts properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_number TEXT;
  free_plan_id UUID := 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';
  plan_exists BOOLEAN;
BEGIN
  -- Sanitize phone number from metadata
  sanitized_number := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'number', ''), '[^0-9]', '', 'g'), '');

  -- Create profile (with conflict handling)
  INSERT INTO public.profiles (user_id, email, name, number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    sanitized_number
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    number = COALESCE(EXCLUDED.number, profiles.number);
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Verify that the Free plan ID exists
  SELECT EXISTS(SELECT 1 FROM public.subscription_plans WHERE id = free_plan_id) INTO plan_exists;
  
  -- Create or update FREE subscription with fixed plan_id
  IF plan_exists THEN
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_id,
      status,
      started_at,
      expires_at
    )
    VALUES (
      NEW.id,
      free_plan_id,
      'active',
      NOW(),
      NULL -- FREE plan has no expiration
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      plan_id = EXCLUDED.plan_id,
      status = COALESCE(EXCLUDED.status, user_subscriptions.status),
      started_at = COALESCE(EXCLUDED.started_at, user_subscriptions.started_at),
      expires_at = EXCLUDED.expires_at;
  ELSE
    -- Log warning if plan doesn't exist (but don't fail the user creation)
    RAISE WARNING 'Free plan with ID % does not exist. Subscription not created for user %.', free_plan_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Ensure trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Add RLS policy to allow users to insert their own subscription
-- This allows the AuthContext code to create subscriptions if trigger fails
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Add RLS policy to allow system/trigger to insert subscriptions
-- This ensures the trigger can insert even with RLS enabled
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.user_subscriptions;

CREATE POLICY "System can insert subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- 5. Update existing subscriptions without plan_id to use Free plan
UPDATE public.user_subscriptions
SET 
  plan_id = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5',
  status = COALESCE(status, 'active'),
  started_at = COALESCE(started_at, NOW())
WHERE plan_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.subscription_plans 
    WHERE id = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5'
  );

-- 6. Update subscriptions with Free plan by name to use the fixed ID
UPDATE public.user_subscriptions us
SET plan_id = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5'
FROM public.subscription_plans sp
WHERE us.plan_id = sp.id
  AND LOWER(sp.name) = 'free'
  AND us.plan_id != 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5'
  AND EXISTS (
    SELECT 1 FROM public.subscription_plans 
    WHERE id = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5'
  );

-- 7. Ensure Free plan exists with the correct ID
INSERT INTO public.subscription_plans (id, name, description, price, features, is_active)
VALUES (
  'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5',
  'Free',
  'Plano gratuito com acesso limitado',
  0.00,
  '["Acesso básico aos documentos", "Visualização limitada"]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that automatically creates profile, role, and Free subscription for new users. Uses fixed plan_id: b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';
COMMENT ON COLUMN public.user_subscriptions.plan_id IS 'Reference to subscription_plans. Free plan ID is b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';







