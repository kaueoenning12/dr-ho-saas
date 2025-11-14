-- Update trigger function to auto-create FREE subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_number TEXT;
  free_plan_id UUID;
BEGIN
  -- Sanitize phone number from metadata
  sanitized_number := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'number', ''), '[^0-9]', '', 'g'), '');

  -- Create profile
  INSERT INTO public.profiles (user_id, email, name, number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    sanitized_number
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Get FREE plan ID
  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE LOWER(name) = 'free'
  LIMIT 1;
  
  -- Create FREE subscription if plan exists
  IF free_plan_id IS NOT NULL THEN
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
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

