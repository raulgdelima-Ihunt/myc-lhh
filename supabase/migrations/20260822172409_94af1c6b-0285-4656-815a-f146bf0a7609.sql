ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS candidatos_email_key;
DROP INDEX IF EXISTS idx_candidatos_email;
CREATE INDEX idx_candidatos_email ON public.candidatos (email);
