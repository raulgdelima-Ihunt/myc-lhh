import type { Database } from '@/integrations/supabase/types';

export const candidateEditFields = [
  ['email', 'E-mail'], ['telefone', 'Telefone'], ['linkedin', 'LinkedIn'],
  ['area', 'Área'], ['nivel_cargo', 'Nível de Cargo'], ['ultimo_salario', 'Último Salário'],
  ['ultima_posicao', 'Última Posição'], ['ultima_empresa', 'Última Empresa'],
  ['posicoes_alvo', 'Posições Alvo'], ['empresas_alvo', 'Empresas Alvo'],
  ['empresas_restritas', 'Empresas Restritas'], ['segmento_alvo', 'Segmento Alvo'],
  ['pretensao_salarial', 'Pretensão Salarial'], ['mobilidade', 'Mobilidade'],
  ['local_residencia', 'Local'], ['observacao', 'Observações'],
  ['faixa_salarial', 'Faixa Salarial'], ['idioma', 'Idioma'],
] as const;
export const indicationEditFields = [
  ['vaga', 'Vaga'], ['empresa', 'Empresa'], ['acao_tipo', 'Ação Tipo'],
  ['resultado', 'Resultado'], ['data_acao', 'Data Ação'], ['vaga_link', 'Link da Vaga'],
  ['formato', 'Formato'], ['indicacao_contato', 'Contato da Indicação'],
  ['data_retorno', 'Data Retorno'], ['follow_up', 'Follow-up'], ['observacoes', 'Observações'],
] as const;

type CandidateUpdate = Database['public']['Tables']['candidatos']['Update'];
type IndicationUpdate = Database['public']['Tables']['indicacoes']['Update'];
export function candidateEditPayload(draft: Record<string, string>, original: Record<string, unknown>): CandidateUpdate {
  return Object.fromEntries(candidateEditFields.filter(([key]) => draft[key] !== undefined && draft[key] !== String(original[key] ?? '')).map(([key]) => [key, draft[key]?.trim() || null]));
}
export function indicationEditPayload(draft: Record<string, string>, original: Record<string, unknown>): IndicationUpdate {
  return Object.fromEntries(indicationEditFields.filter(([key]) => draft[key] !== undefined && draft[key] !== String(original[key] ?? '')).map(([key]) => [key, draft[key]?.trim() || (key === 'data_acao' ? '1900-01-01' : null)]));
}
export function staffHome(role: string | null): '/admin' | '/consultor' | '/conector' | '/dashboard' {
  if (role === 'admin') return '/admin';
  if (role === 'consultor') return '/consultor';
  if (role === 'conector') return '/conector';
  return '/dashboard';
}
export function canAccessStaffRoute(role: string | null, pathname: string): boolean {
  if (role === 'admin') return true;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/consultor')) return role === 'consultor';
  if (pathname.startsWith('/conector')) return role === 'conector';
  return true;
}
