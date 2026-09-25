ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS conector_id uuid REFERENCES public.conectores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_candidatos_conector_id ON public.candidatos(conector_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conectores_nome_lower ON public.conectores (lower(trim(nome)));