import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";
import { useCandidato, useCandidatoIndicacoes, useCandidatoDistribuicao } from "@/hooks/use-candidato-data";
import { getStatusMeta } from "@/lib/candidato-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import { formatDateBR, isEntrevistaGerada } from "@/lib/date-utils";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { candidateEditFields, candidateEditPayload } from "@/lib/portal-editing";

const formatActionDate = formatDateBR;

function resultadoBadgeClass(resultado: string | null | undefined) {
  const r = (resultado || "").toLowerCase();
  if (isEntrevistaGerada(resultado)) return "bg-[#4CAF50] text-white ring-1 ring-[#4CAF50]";
  if (r.includes("entrevista")) return "bg-green-100 text-[#4CAF50]";
  if (r.includes("cv enviado")) return "bg-purple-100 text-primary";
  return "bg-gray-100 text-[#666666]";
}

export const Route = createFileRoute("/consultor/candidato/$id")({
  head: () => ({
    meta: [
      { title: "Candidato da Carteira | MyCareer by LHH" },
      { name: "description", content: "Visualização das indicações do candidato da sua carteira." },
      { property: "og:title", content: "Candidato da Carteira | MyCareer by LHH" },
      { property: "og:description", content: "Visualização das indicações do candidato da sua carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsultorCandidatoDetail,
});

function Field({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">{label}</p>
      <p className="text-sm font-medium text-[#333333]">{String(value)}</p>
    </div>
  );
}

function ConsultorCandidatoDetail() {
  const { id } = useParams({ from: "/consultor/candidato/$id" });
  const navigate = useNavigate();
  const { data: candidato, isLoading } = useCandidato(id);
  const { data: indicacoes, isLoading: isLoadingIndicacoes } = useCandidatoIndicacoes(id);
  const { data: distribuidoEm } = useCandidatoDistribuicao(id);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  function startEditing() {
    if (!candidato) return;
    setDraft(Object.fromEntries(candidateEditFields.map(([key]) => [key, candidato[key] ?? ""])));
    setEditing(true);
  }

  async function saveCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!candidato || saving) return;
    const payload = candidateEditPayload(draft, candidato);
    if (!Object.keys(payload).length) { setEditing(false); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("candidatos").update(payload).eq("id", id).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("Cadastro não atualizado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidato", id] }),
        queryClient.invalidateQueries({ queryKey: ["consultor-carteira"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate-dashboard"] }),
      ]);
      setEditing(false);
      toast.success("Cadastro atualizado com sucesso");
    } catch {
      toast.error("Não foi possível salvar o cadastro. Tente novamente.");
    } finally { setSaving(false); }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto animate-spin text-primary" />
      </div>
    );
  }

  const statusMeta = getStatusMeta(candidato?.status);

  return (
    <AuthGuard>
      <header className="border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <img src="/logo.svg" alt="LHH" className="h-auto w-[120px]" />
          <Button variant="outline" className="rounded-[6px]" onClick={() => navigate({ to: "/consultor" })}>
            <ArrowLeft size={18} className="mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <div className="min-h-screen bg-[#F5F5F5] p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-xl border border-border bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#333333]">{candidato?.nome}</h1>
                {distribuidoEm && (
                  <p className="text-xs text-[#666666]">Distribuído em {formatDateBR(distribuidoEm)}</p>
                )}
                <p className="font-medium text-[#666666]">{candidato?.email || "E-mail não informado"}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <form onSubmit={saveCandidate} className="mt-6 border-t border-border pt-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Cadastro do Candidato</h2>
                {editing ? <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saving ? "Salvando..." : "Salvar"}</Button>
                </div> : <Button type="button" onClick={startEditing} disabled={!candidato}>Editar Cadastro</Button>}
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
                <Field label="Referral" value={candidato?.referral_id || "—"} />
                <Field label="Nome" value={candidato?.nome || "—"} />
                <Field label="Nome Completo" value={candidato?.nome_completo || "—"} />
                {candidateEditFields.map(([key, label]) => editing ? (
                  <label key={key} className={`space-y-1 text-sm font-medium text-foreground ${key === "observacao" ? "sm:col-span-3" : ""}`}>
                    <span>{label}</span>
                    {["posicoes_alvo", "empresas_alvo", "empresas_restritas", "observacao"].includes(key) ? (
                      <Textarea aria-label={label} value={draft[key] ?? ""} disabled={saving} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />
                    ) : <Input aria-label={label} type={key === "email" ? "email" : "text"} value={draft[key] ?? ""} disabled={saving} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />}
                  </label>
                ) : <Field key={key} label={label} value={candidato?.[key]} />)}
              </div>
            </form>
          </div>

          <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#666666]">Total de indicações</p>
              <p className="text-4xl font-black text-primary">{indicacoes?.length || 0}</p>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="border-b border-border bg-[#FAFAFA] p-6">
              <h2 className="text-lg font-bold text-[#333333]">Histórico de Indicações</h2>
            </div>
            {isLoadingIndicacoes ? (
              <div className="p-12 text-center">
                <Loader2 className="mx-auto animate-spin text-primary" />
              </div>
            ) : indicacoes && indicacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#F5F5F5] text-xs font-bold uppercase tracking-wider text-[#666666]">
                    <tr>
                      <th className="px-6 py-4">Vaga</th>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4 text-center">Data</th>
                      <th className="px-6 py-4">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {indicacoes.map((i, index) => (
                      <tr key={i.id} className={index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                        <td className="px-6 py-4 text-sm font-semibold">
                          {i.vaga_link && i.vaga_link.trim() ? (
                            <a
                              href={i.vaga_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#6B2D8B] hover:underline"
                            >
                              {i.vaga}
                            </a>
                          ) : (
                            <span className="text-[#333333]">{i.vaga}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#666666]">{i.empresa}</td>
                        <td className="px-6 py-4 text-center text-sm text-[#666666]">{formatActionDate(i.data_acao)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter ${resultadoBadgeClass(i.resultado)}`}>
                            {i.resultado || "Sem retorno"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center">
                <Briefcase className="mx-auto mb-3 text-gray-300" size={32} />
                <p className="text-sm text-[#666666]">Nenhuma indicação registrada para este candidato.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
