import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

export const useCandidatoIndicacoes = (candidatoId: string) => {
  return useQuery({
    queryKey: ["candidato-indicacoes", candidatoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicacoes")
        .select("*")
        .eq("candidato_id", candidatoId)
        .order("data_acao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCandidateDashboard = (email: string) => {
  return useQuery({
    queryKey: ["candidate-dashboard", email],
    queryFn: async () => {
      const { data: candidato, error: candError } = await supabase
        .from("candidatos")
        .select("*")
        .eq("email", email)
        .single();
      if (candError) throw candError;

      const { data: indicacoes, error: indError } = await supabase
        .from("indicacoes")
        .select("*")
        .eq("candidato_id", candidato.id)
        .order("data_acao", { ascending: false });
      if (indError) throw indError;

      return { candidato, indicacoes };
    },
  });
};
