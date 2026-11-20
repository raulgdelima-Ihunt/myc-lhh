import { describe, it, expect } from 'vitest';
import { candidateEditFields, candidateEditPayload, conectorCandidateProfileFields, indicationEditFields, indicationEditPayload, canAccessStaffRoute, staffHome } from './portal-editing';

describe('portal editing permissions', () => {
  it('allows connectors only their staff area and sends them there', () => {
    expect(canAccessStaffRoute('conector', '/conector')).toBe(true);
    expect(canAccessStaffRoute('conector', '/admin')).toBe(false);
    expect(canAccessStaffRoute('conector', '/consultor/candidato/123')).toBe(false);
    expect(staffHome('conector')).toBe('/conector');
  });
  it('allows admins all three staff areas', () => {
    for (const path of ['/admin', '/consultor', '/conector']) expect(canAccessStaffRoute('admin', path)).toBe(true);
  });
  it('denies connector area to consultants and candidates', () => {
    expect(canAccessStaffRoute('consultor', '/conector')).toBe(false);
    expect(canAccessStaffRoute('candidato', '/conector')).toBe(false);
  });
  it('updates only the 18 allowed candidate fields, never identity or status', () => {
    expect(candidateEditFields.map(([k]) => k)).toEqual(['email','telefone','linkedin','area','nivel_cargo','ultimo_salario','ultima_posicao','ultima_empresa','posicoes_alvo','empresas_alvo','empresas_restritas','segmento_alvo','pretensao_salarial','mobilidade','local_residencia','observacao','faixa_salarial','idioma']);
    expect(candidateEditPayload({ email: 'novo@example.com', nome: 'Outro', nome_completo: 'Outro', referral_id: '123', status: 'inativo' }, { email: 'antigo@example.com' })).toEqual({ email: 'novo@example.com' });
  });
  it('updates only allowed indication fields, not ownership or origin', () => {
    expect(indicationEditFields.map(([k]) => k)).toEqual(['vaga','empresa','acao_tipo','resultado','data_acao','vaga_link','formato','indicacao_contato','data_retorno','follow_up','observacoes']);
    expect(indicationEditPayload({ vaga: 'Gerente', candidato_id: 'other', jobhunter: 'Other', origem: 'Other', created_at: 'Other' }, {})).toEqual({ vaga: 'Gerente' });
  });
  it('preserves unchanged and undated fields on save', () => {
    expect(indicationEditPayload({ data_acao: '1900-01-01', resultado: 'Entrevista gerada' }, { data_acao: '1900-01-01', resultado: 'Entrevista gerada' })).toEqual({});
    expect(candidateEditPayload({ telefone: '123' }, { telefone: '123' })).toEqual({});
  });
  it('gives connectors a read-only candidate profile limited to the agreed registration fields', () => {
    expect(conectorCandidateProfileFields.map(([k]) => k)).toEqual(['nome','email','telefone','linkedin','consultor_responsavel','ultima_posicao','ultima_empresa','area','nivel_cargo','posicoes_alvo','segmento_alvo','empresas_alvo','mobilidade','local_residencia','programa','status_programa','observacao']);
    for (const hidden of ['id','nome_normalizado','referral_id','conector_id','status','created_at']) {
      expect(conectorCandidateProfileFields.some(([k]) => k === hidden)).toBe(false);
    }
  });
});
