DROP POLICY IF EXISTS "candidato_ve_proprio_cadastro" ON public.candidatos;

CREATE POLICY "candidato_ve_proprio_cadastro"
ON public.candidatos
FOR SELECT
TO authenticated
USING (
  lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "candidato_ve_suas_indicacoes" ON public.indicacoes;

CREATE POLICY "candidato_ve_suas_indicacoes"
ON public.indicacoes
FOR SELECT
TO authenticated
USING (
  candidato_id IN (
    SELECT id
    FROM public.candidatos
    WHERE lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);