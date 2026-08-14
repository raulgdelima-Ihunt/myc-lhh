-- 1. CRIAR TABELAS NO SUPABASE

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'candidato',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: user_reads_own_role
CREATE POLICY "user_reads_own_role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Grant access to user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Create candidatos table
CREATE TABLE public.candidatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  email TEXT UNIQUE,
  parceiro TEXT DEFAULT 'LHH',
  area TEXT,
  nivel_cargo TEXT,
  ultimo_salario TEXT,
  telefone TEXT,
  consultor_responsavel TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on candidatos
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

-- Policy: candidato_ve_proprio_cadastro
CREATE POLICY "candidato_ve_proprio_cadastro" ON public.candidatos
  FOR SELECT TO authenticated
  USING (
    email = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: admin_gerencia_candidatos
CREATE POLICY "admin_gerencia_candidatos" ON public.candidatos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Grant access to candidatos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatos TO authenticated;
GRANT ALL ON public.candidatos TO service_role;

-- Create indicacoes table
CREATE TABLE public.indicacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidato_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE,
  vaga TEXT NOT NULL,
  empresa TEXT NOT NULL,
  acao_tipo TEXT,
  indicacao_contato TEXT,
  vaga_link TEXT,
  formato TEXT,
  data_acao DATE,
  resultado TEXT,
  jobhunter TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(candidato_id, vaga, empresa, data_acao)
);

-- Enable RLS on indicacoes
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

-- Policy: candidato_ve_suas_indicacoes
CREATE POLICY "candidato_ve_suas_indicacoes" ON public.indicacoes
  FOR SELECT TO authenticated
  USING (
    candidato_id IN (SELECT id FROM public.candidatos WHERE email = auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Policy: admin_gerencia_indicacoes
CREATE POLICY "admin_gerencia_indicacoes" ON public.indicacoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Grant access to indicacoes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicacoes TO authenticated;
GRANT ALL ON public.indicacoes TO service_role;

-- 2. INSERIR ROLE ADMIN para o usuário existente
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@lhh.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
