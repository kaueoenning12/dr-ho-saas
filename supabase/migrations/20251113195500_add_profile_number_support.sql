-- Ensure profiles table has a phone number column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS number TEXT;

-- Update trigger function to store phone number from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_number TEXT;
BEGIN
  sanitized_number := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'number', ''), '[^0-9]', '', 'g'), '');

  INSERT INTO public.profiles (user_id, email, name, number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    sanitized_number
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with phone numbers stored in auth metadata
UPDATE public.profiles p
SET number = NULLIF(REGEXP_REPLACE(COALESCE(au.raw_user_meta_data->>'number', ''), '[^0-9]', '', 'g'), '')
FROM auth.users au
WHERE p.user_id = au.id
  AND COALESCE(au.raw_user_meta_data->>'number', '') <> ''
  AND p.number IS DISTINCT FROM NULLIF(REGEXP_REPLACE(COALESCE(au.raw_user_meta_data->>'number', ''), '[^0-9]', '', 'g'), '');

