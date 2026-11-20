import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createConectorAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    email: z.string().trim().email(),
    password: z.string().min(6),
    nome: z.string().trim().min(1),
  }).strict().parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { provisionConector } = await import("./conector-access.server");
    return provisionConector(context.supabase, context.userId, data, async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return supabaseAdmin;
    });
  });