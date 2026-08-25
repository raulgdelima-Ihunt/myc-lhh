UPDATE public.indicacoes
SET data_acao = DATE '1900-01-01'
WHERE data_acao IS NULL;

ALTER TABLE public.indicacoes
ALTER COLUMN data_acao SET DEFAULT DATE '1900-01-01';

ALTER TABLE public.indicacoes
ALTER COLUMN data_acao SET NOT NULL;