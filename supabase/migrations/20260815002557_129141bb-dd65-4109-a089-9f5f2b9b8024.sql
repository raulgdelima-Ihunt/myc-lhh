-- Drop any existing policies that might allow self-assignment
DROP POLICY IF EXISTS "user_reads_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "anyone_authenticated_reads_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "service_role_full_access" ON public.user_roles;
DROP POLICY IF EXISTS "admin_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;

-- 1. Qualquer usuário logado pode LER sua própria role (necessário pro redirect funcionar)
CREATE POLICY "select_own_role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. APENAS service_role pode inserir/atualizar/deletar (usado pelo admin via supabaseAdmin client)
CREATE POLICY "service_manages_roles" ON public.user_roles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure correct grants (authenticated can only select)
REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
