import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createCandidateAccess = createServerFn({ method: "POST" })
  .validator((data: unknown) => 
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // 1. Check if the caller is an admin
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can create candidate access");
    }

    // 2. Use supabaseAdmin to create the user and assign the role
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Use admin API to create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true
    });

    if (createError) {
      throw createError;
    }

    if (userData.user) {
      // 3. Assign 'user' role using supabaseAdmin (bypasses RLS)
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userData.user.id,
          role: "user"
        });

      if (roleInsertError) {
        console.error("Error assigning role:", roleInsertError);
      }
    }

    return { success: true, userId: userData.user?.id };
  });
