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
      const { data, error } = await supabase.from("candidatos").select("email");
      if (error) throw error;

      const total = data.length;
      const withEmail = data.filter((c) => c.email && c.email.trim() !== "").length;
      const withoutEmail = total - withEmail;

      return { total, withEmail, withoutEmail };
    },
  });
};
