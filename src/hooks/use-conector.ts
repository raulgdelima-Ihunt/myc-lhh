import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { compareDateDesc, isDistribuicao } from '@/lib/date-utils';

type Indication = Database['public']['Tables']['indicacoes']['Row'];
export type ConectorIndicacao = Indication & { candidato_nome: string };

export function useConectorIndicacoes(userId?: string) {
  return useQuery({
    queryKey: ['conector-indicacoes', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ConectorIndicacao[]> => {
      const indicacoes: Indication[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('indicacoes').select('*').order('id').range(from, from + 999);
        if (error) throw error;
        indicacoes.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) break;
      }
      const ids = [...new Set(indicacoes.flatMap(i => i.candidato_id ? [i.candidato_id] : []))];
      const names = new Map<string, string>();
      for (let offset = 0; offset < ids.length; offset += 200) {
        const { data, error } = await supabase.from('candidatos').select('id, nome').in('id', ids.slice(offset, offset + 200));
        if (error) throw error;
        for (const c of data ?? []) names.set(c.id, c.nome);
      }
      return indicacoes.filter(i => !isDistribuicao(i)).sort((a, b) => compareDateDesc(a.data_acao, b.data_acao))
        .map(i => ({ ...i, candidato_nome: i.candidato_id ? names.get(i.candidato_id) ?? 'Candidato não disponível' : 'Não vinculado' }));
    },
  });
}
