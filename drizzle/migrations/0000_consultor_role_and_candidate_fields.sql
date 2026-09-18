-- New candidate columns from the updated spreadsheet
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS programa TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS status_dte TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS status_orbit TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS data_cv_dte DATE;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS situacao_dte TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS complemento_situacao_dte TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS talent TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS forms_preenchido TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS idioma TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS empresas_restritas TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS faixa_salarial TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS carta_apresentacao TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS lgpd TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS pcd TEXT;
ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS descricao_pcd TEXT;

-- Consultant identity on roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS nome_consultor TEXT;

-- Helper functions (security definer, avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_consultor_nome()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome_consultor
  FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'consultor'
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_consultor_nome() TO authenticated;

-- Consultant read-only access to their own portfolio
DROP POLICY IF EXISTS consultor_ve_seus_candidatos ON public.candidatos;
CREATE POLICY consultor_ve_seus_candidatos
ON public.candidatos
FOR SELECT
TO authenticated
USING (
  public.current_consultor_nome() IS NOT NULL
  AND lower(trim(coalesce(consultor_responsavel, ''))) = lower(trim(public.current_consultor_nome()))
);

DROP POLICY IF EXISTS consultor_ve_indicacoes_carteira ON public.indicacoes;
CREATE POLICY consultor_ve_indicacoes_carteira
ON public.indicacoes
FOR SELECT
TO authenticated
USING (
  public.current_consultor_nome() IS NOT NULL
  AND candidato_id IN (
    SELECT id FROM public.candidatos
    WHERE lower(trim(coalesce(consultor_responsavel, ''))) = lower(trim(public.current_consultor_nome()))
  )
);
