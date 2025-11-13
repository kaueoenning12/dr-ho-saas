-- Criar função para deletar usuário (apenas admins)
CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem está chamando é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários';
  END IF;

  -- Deletar o usuário (cascade deletará profiles, roles, etc)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

