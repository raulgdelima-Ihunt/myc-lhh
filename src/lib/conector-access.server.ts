import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function provisionConector(
  caller: SupabaseClient<Database>,
  userId: string,
  input: { email: string; password: string; nome: string },
  loadAdmin: () => Promise<SupabaseClient<Database>>,
) {
  const { data: roles, error: roleError } = await caller
    .from("user_roles").select("role").eq("user_id", userId);
  if (roleError || !roles?.some(({ role }) => role === "admin")) {
    throw new Error("Somente administradores podem criar login de conectores.");
  }

  const admin = await loadAdmin();
  const email = input.email.trim().toLowerCase();
  const nome = input.nome.trim();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: input.password, email_confirm: true,
  });
  if (createError) {
    if (createError.code === "email_exists" || createError.code === "user_already_exists" || /already.*(registered|exist)/i.test(createError.message)) {
      throw new Error("Este e-mail já possui uma conta. Nenhuma senha ou permissão existente foi alterada.");
    }
    throw new Error("Não foi possível criar o login: " + createError.message);
  }
  if (!created.user) throw new Error("Não foi possível criar o usuário do conector.");

  const { error: insertRoleError } = await admin.from("user_roles").insert({
    user_id: created.user.id, role: "conector", nome_consultor: nome,
  });
  if (insertRoleError) {
    throw new Error("A conta foi criada, mas o perfil de conector não foi configurado. Solicite a regularização à administração antes de tentar novamente.");
  }
  const { data: conector, error: conectorError } = await caller.from("conectores")
    .insert({ nome, email }).select("id").single();
  if (conectorError || !conector) {
    throw new Error("O login foi criado, mas o cadastro na lista de conectores falhou. Solicite a regularização à administração antes de tentar novamente.");
  }
  return { success: true, user: { id: created.user.id, email, role: "conector", nome }, conectorId: conector.id };
}