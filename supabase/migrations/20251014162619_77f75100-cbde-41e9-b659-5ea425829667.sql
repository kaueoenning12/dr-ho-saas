-- Fix search_path for update_document_search_vector function
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', 
    coalesce(NEW.title, '') || ' ' || 
    coalesce(NEW.description, '') || ' ' || 
    coalesce(array_to_string(NEW.keywords, ' '), '')
  );
  RETURN NEW;
END;
$$;