import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { provisionConector } from "./conector-access.server";

function setup(role = "admin") {
  const roleInsert = vi.fn().mockResolvedValue({ error: null });
  const referenceInsert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "connector-1" }, error: null }) }) });
  const caller = { from: (table: string) => table === "user_roles"
    ? { select: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) }
    : { insert: referenceInsert } } as unknown as SupabaseClient<Database>;
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
  const admin = { auth: { admin: { createUser } }, from: () => ({ insert: roleInsert }) } as unknown as SupabaseClient<Database>;
  const loadAdmin = vi.fn().mockResolvedValue(admin);
  return { caller, createUser, roleInsert, referenceInsert, loadAdmin };
}
const input = { email: " Connector@Example.com ", password: "Lhh@2026", nome: " Conector Nome " };

describe("connector account provisioning", () => {
  it("creates a confirmed Auth Admin account with the supplied password", async () => {
    const s = setup();
    await provisionConector(s.caller, "admin-user", input, s.loadAdmin);
    expect(s.createUser).toHaveBeenCalledWith({ email: "connector@example.com", password: "Lhh@2026", email_confirm: true });
  });
  it("always assigns conector and stores the form name in nome_consultor", async () => {
    const s = setup();
    await provisionConector(s.caller, "admin-user", input, s.loadAdmin);
    expect(s.roleInsert).toHaveBeenCalledWith({ user_id: "new-user", role: "conector", nome_consultor: "Conector Nome" });
    expect(s.referenceInsert).toHaveBeenCalledWith({ nome: "Conector Nome", email: "connector@example.com" });
  });
  it.each(["conector", "consultor", "user"])("denies %s before loading the privileged client", async (role) => {
    const s = setup(role);
    await expect(provisionConector(s.caller, "caller", input, s.loadAdmin)).rejects.toThrow("Somente administradores");
    expect(s.loadAdmin).not.toHaveBeenCalled();
  });
  it("leaves existing accounts untouched and does not add a reference on duplicate email", async () => {
    const s = setup();
    s.createUser.mockResolvedValue({ data: { user: null }, error: { code: "email_exists", message: "Already registered" } });
    await expect(provisionConector(s.caller, "admin-user", input, s.loadAdmin)).rejects.toThrow("já possui uma conta");
    expect(s.roleInsert).not.toHaveBeenCalled();
    expect(s.referenceInsert).not.toHaveBeenCalled();
  });
  it("reports partial creation instead of claiming success when role assignment fails", async () => {
    const s = setup();
    s.roleInsert.mockResolvedValue({ error: { message: "Insert failed" } });
    await expect(provisionConector(s.caller, "admin-user", input, s.loadAdmin)).rejects.toThrow("perfil de conector não foi configurado");
    expect(s.referenceInsert).not.toHaveBeenCalled();
  });
});