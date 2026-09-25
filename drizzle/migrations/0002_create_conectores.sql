CREATE TABLE public.conectores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.conectores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conectores TO authenticated;
GRANT ALL ON public.conectores TO service_role;

ALTER TABLE public.conectores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_leem_conectores" ON public.conectores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_gerencia_conectores" ON public.conectores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));