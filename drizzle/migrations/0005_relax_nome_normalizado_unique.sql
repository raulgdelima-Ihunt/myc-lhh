ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS candidatos_nome_normalizado_key;
CREATE INDEX IF NOT EXISTS idx_candidatos_nome_normalizado ON public.candidatos(nome_normalizado);