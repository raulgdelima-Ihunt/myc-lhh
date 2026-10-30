import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { splitIndicacoes } from "@/lib/date-utils";

export const useCandidato = (id: string) => {
  return useQuery({
    queryKey: ["candidato", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
};

const fetchIndicacoesRaw = async (candidatoId: string) => {
  const { data, error } = await supabase
    .from("indicacoes")
    .select("*")
    .eq("candidato_id", candidatoId)
    .order("data_acao", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Real indications only (no 'Distribuição' rows), newest first, undated last. */
export const useCandidatoIndicacoes = (candidatoId: string) => {
  return useQuery({
    queryKey: ["candidato-indicacoes", candidatoId],
    queryFn: () => fetchIndicacoesRaw(candidatoId),
    select: (rows) => splitIndicacoes(rows).indicacoes,
  });
};

/** Date of the 'Distribuição' record for the candidate, if any. */
export const useCandidatoDistribuicao = (candidatoId: string) => {
  return useQuery({
    queryKey: ["candidato-indicacoes", candidatoId],
    queryFn: () => fetchIndicacoesRaw(candidatoId),
    select: (rows) => splitIndicacoes(rows).distribuidoEm,
  });
};

export const useCandidateDashboard = (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  return useQuery({
    queryKey: ["candidate-dashboard", normalizedEmail],
    enabled: normalizedEmail.length > 0,
    queryFn: async () => {
      const { data: candidatos, error: candError } = await supabase
        .from("candidatos")
        .select("*")
        .ilike("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      if (candError) throw candError;
      const candidato = candidatos?.[0];
      if (!candidato) throw new Error("Candidato não encontrado");

      const rows = await fetchIndicacoesRaw(candidato.id);
      const { indicacoes, distribuidoEm } = splitIndicacoes(rows);

      return { candidato, indicacoes, distribuidoEm };
    },
  });
};
