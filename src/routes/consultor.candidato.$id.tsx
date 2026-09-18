import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";
import { useCandidato, useCandidatoIndicacoes } from "@/hooks/use-candidato-data";
import { getStatusMeta } from "@/lib/candidato-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";

const DEFAULT_ACTION_DATE = "1900-01-01";

function formatActionDate(date: string | null | undefined) {
  if (!date || date === DEFAULT_ACTION_DATE) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
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
                <p className="font-medium text-[#666666]">{candidato?.email || "E-mail não informado"}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
              <Field label="Área" value={candidato?.area} />
              <Field label="Nível de Cargo" value={candidato?.nivel_cargo} />
              <Field label="Telefone" value={candidato?.telefone} />
              <Field label="Última Posição" value={candidato?.ultima_posicao} />
              <Field label="Última Empresa" value={candidato?.ultima_empresa} />
              <Field label="Posições Alvo" value={candidato?.posicoes_alvo} />
              <Field label="Empresas Alvo" value={candidato?.empresas_alvo} />
              <Field label="Local" value={candidato?.local_residencia} />
              <Field label="Mobilidade" value={candidato?.mobilidade} />
            </div>
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
                        <td className="px-6 py-4 text-sm font-semibold text-[#333333]">{i.vaga}</td>
                        <td className="px-6 py-4 text-sm text-[#666666]">{i.empresa}</td>
                        <td className="px-6 py-4 text-center text-sm text-[#666666]">{formatActionDate(i.data_acao)}</td>
                        <td className="px-6 py-4 text-sm text-[#666666]">{i.resultado || "Sem retorno"}</td>
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
