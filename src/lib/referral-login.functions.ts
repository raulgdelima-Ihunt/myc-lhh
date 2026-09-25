import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Resolves a candidate's login email from their Referral ID (public, used before sign-in).
export const resolveReferralEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ referral: z.string().trim().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("candidatos")
      .select("email")
      .eq("referral_id", data.referral)
      .limit(1);
    if (error) throw new Error("Erro ao verificar código");
    const email = rows?.[0]?.email?.trim().toLowerCase();
    return { email: email || null };
  });
