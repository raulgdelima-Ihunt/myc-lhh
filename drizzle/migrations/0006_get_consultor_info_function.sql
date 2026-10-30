CREATE OR REPLACE FUNCTION public.get_consultor_info(p_nome text)
RETURNS TABLE(nome text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.nome_consultor AS nome, u.email
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.role = 'consultor'
    AND ur.nome_consultor = p_nome
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_consultor_info(text) TO authenticated;