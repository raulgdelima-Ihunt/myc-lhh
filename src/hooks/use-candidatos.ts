import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useCandidatos = (searchTerm: string = "") => {
  return useQuery({
    queryKey: ["candidatos", searchTerm],
    queryFn: async () => {
      let query = supabase.from("candidatos").select("*").order("nome");
      
      if (searchTerm) {
        query = query.ilike("nome", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Get candidates stats
      const { data: candidatesData, error: candidatesError } = await supabase.from("candidatos").select("email");
      if (candidatesError) throw candidatesError;

      const totalCandidates = candidatesData.length;
      const candidatesWithEmail = candidatesData.filter((c) => c.email && c.email.trim() !== "").length;
      const candidatesWithoutEmail = totalCandidates - candidatesWithEmail;

      // Get total indications
      const { count: totalIndicacoes, error: indicacoesError } = await supabase
        .from("indicacoes")
        .select("*", { count: 'exact', head: true });
      
      if (indicacoesError) throw indicacoesError;

      return { 
        total: totalCandidates, 
        withEmail: candidatesWithEmail, 
        withoutEmail: candidatesWithoutEmail,
        totalIndicacoes: totalIndicacoes || 0
      };
    },
  });
};
