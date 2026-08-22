ALTER TABLE public.candidatos 
ADD COLUMN IF NOT EXISTS link_relatorio text,
ADD COLUMN IF NOT EXISTS cv_candidato text,
ADD COLUMN IF NOT EXISTS reuniao_status text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatos TO authenticated;
GRANT ALL ON public.candidatos TO service_role;