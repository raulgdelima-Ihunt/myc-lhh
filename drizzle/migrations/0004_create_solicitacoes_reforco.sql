CREATE TABLE public.solicitacoes_reforco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  titulo_vaga TEXT NOT NULL,
  empresa TEXT NOT NULL,
  link_vaga TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_reforco TO authenticated;
GRANT ALL ON public.solicitacoes_reforco TO service_role;

ALTER TABLE public.solicitacoes_reforco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gerencia_solicitacoes" ON public.solicitacoes_reforco
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "candidato_cria_e_ve_suas_solicitacoes" ON public.solicitacoes_reforco
  FOR ALL TO authenticated
  USING (candidato_id IN (SELECT id FROM candidatos WHERE lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))))
  WITH CHECK (candidato_id IN (SELECT id FROM candidatos WHERE lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))));