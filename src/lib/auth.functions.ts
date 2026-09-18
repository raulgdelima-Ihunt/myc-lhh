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

export const getCandidateAccessStatus = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({
      email: z.string().email(),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can check candidate access");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) throw usersError;

    const user = usersData.users.find(
      (candidateUser) => candidateUser.email?.toLowerCase() === data.email.toLowerCase(),
    );

    return { hasAccess: Boolean(user), userId: user?.id ?? null };
  });

export const resetCandidatePassword = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can reset candidate passwords");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) throw usersError;

    const user = usersData.users.find(
      (candidateUser) => candidateUser.email?.toLowerCase() === data.email.toLowerCase(),
    );

    if (!user) {
      throw new Error("Candidato ainda não possui acesso criado");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.password,
    });

    if (updateError) throw updateError;

    return { success: true, userId: user.id };
  });

export const createConsultorAccess = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      nome: z.string().min(2),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can create consultant access");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let consultorUserId: string | null = null;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError) {
      const message = createError.message || "";
      if (!message.toLowerCase().includes("already")) throw createError;

      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw usersError;

      const existing = usersData.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw createError;

      consultorUserId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: data.password });
    } else {
      consultorUserId = created.user?.id ?? null;
    }

    if (!consultorUserId) throw new Error("Não foi possível criar o usuário do consultor");

    const { error: deleteRoleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", consultorUserId);
    if (deleteRoleError) throw deleteRoleError;

    const { error: insertRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: consultorUserId, role: "consultor", nome_consultor: data.nome.trim() });
    if (insertRoleError) throw insertRoleError;

    return { success: true, userId: consultorUserId };
  });
