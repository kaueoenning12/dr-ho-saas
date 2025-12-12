-- Migration to allow service role (Edge Functions) to access stripe_config
-- Edge Functions use SUPABASE_SERVICE_ROLE_KEY which should bypass RLS
-- But we add an explicit policy to ensure access

-- Allow service role to read stripe_config (Edge Functions need this)
-- Service role uses auth.role() = 'service_role' which bypasses RLS by default
-- But we add this policy for clarity and to ensure it works

-- Note: Service role should already bypass RLS, but this makes it explicit
-- If service role is not working, check that SUPABASE_SERVICE_ROLE_KEY is set correctly

-- The service role should already have access, but we can verify by checking:
-- SELECT auth.role(); -- Should return 'service_role' when using service role key

-- No policy needed for service_role as it bypasses RLS by default
-- But we can add a comment to document this

COMMENT ON TABLE public.stripe_config IS 
'Stores Stripe API configuration. Edge Functions (using service_role) can access this table. 
Regular users need admin role to view/manage via RLS policies.';




