import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useMyRole = (userId?: string) => {
  return useQuery({
    queryKey: ["my-role", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, nome_consultor")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useConsultorCarteira = (enabled: boolean) => {
  return useQuery({
    queryKey: ["consultor-carteira"],
    enabled,
    queryFn: async () => {
      const { data: candidatos, error } = await supabase
        .from("candidatos")
        .select("*")
        .order("nome");
      if (error) throw error;

      const ids = (candidatos ?? []).map((c) => c.id);
      let indicacoes: { candidato_id: string | null; data_acao: string }[] = [];

      if (ids.length > 0) {
        const { data: indData, error: indError } = await supabase
          .from("indicacoes")
          .select("candidato_id, data_acao")
          .in("candidato_id", ids);
        if (indError) throw indError;
        indicacoes = indData ?? [];
      }

      return (candidatos ?? []).map((candidato) => {
        const own = indicacoes.filter((i) => i.candidato_id === candidato.id);
        const dates = own
          .map((i) => i.data_acao)
          .filter((d) => d && d !== "1900-01-01")
          .sort()
          .reverse();
        return {
          ...candidato,
          totalIndicacoes: own.length,
          ultimaIndicacao: dates[0] ?? null,
        };
      });
    },
  });
};
