import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, CheckCircle, Briefcase, KeyRound, Pencil, Trash2 } from "lucide-react";
import { useCandidato, useCandidatoIndicacoes } from "@/hooks/use-candidato-data";
import { createCandidateAccess, getCandidateAccessStatus, resetCandidatePassword } from "@/lib/auth.functions";
import { CANDIDATO_STATUS_OPTIONS, getStatusMeta } from "@/lib/candidato-status";
import { toast } from "sonner";

const DEFAULT_ACTION_DATE = "1900-01-01";

function formatActionDate(date: string | null | undefined) {
  if (!date || date === DEFAULT_ACTION_DATE) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export const Route = createFileRoute("/admin/candidato/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do Candidato | MyCareer by LHH" },
      { name: "description", content: "Detalhes administrativos do candidato e histórico de indicações." },
      { property: "og:title", content: "Detalhe do Candidato | MyCareer by LHH" },
      { property: "og:description", content: "Detalhes administrativos do candidato e histórico de indicações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CandidatoDetail,
});

function DataField({ label, value, isLink }: { label: string; value?: any; isLink?: boolean }) {
  if (!value) return null;
  const displayValue = String(value).trim();
  if (!displayValue || displayValue === "-" || displayValue === "0") return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{label}</p>
      {isLink ? (
        <a 
          href={displayValue.startsWith('http') ? displayValue : `https://${displayValue}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-sm text-primary hover:underline font-medium break-all"
        >
          {displayValue}
        </a>
      ) : (
        <p className="text-sm text-[#333333] font-medium">{displayValue}</p>
      )}
    </div>
  );
}

function CandidatoDetail() {
  const { id } = useParams({ from: "/admin/candidato/$id" });
  const [isCreating, setIsCreating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [passwordAction, setPasswordAction] = useState<"created" | "reset">("created");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [editingIndicacao, setEditingIndicacao] = useState<any | null>(null);
  const [isSavingIndicacao, setIsSavingIndicacao] = useState(false);
  const [deletingIndicacaoId, setDeletingIndicacaoId] = useState<string | null>(null);

  const { data: candidato, isLoading: isLoadingCandidato, refetch: refetchCandidato } = useCandidato(id);
  const { data: indicacoes, isLoading: isLoadingIndicacoes, refetch: refetchIndicacoes } = useCandidatoIndicacoes(id);

  const handleStatusChange = async (nextStatus: string) => {
    setIsSavingStatus(true);
    const { error } = await supabase
      .from("candidatos")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      toast.error("Não foi possível alterar o status: " + error.message);
    } else {
      toast.success("Status atualizado.");
      await refetchCandidato();
    }
    setIsSavingStatus(false);
  };

  const handleSaveIndicacao = async () => {
    if (!editingIndicacao) return;
    if (!editingIndicacao.vaga?.trim() || !editingIndicacao.empresa?.trim()) {
      toast.error("Vaga e empresa são obrigatórias.");
      return;
    }

    setIsSavingIndicacao(true);
    const { error } = await supabase
      .from("indicacoes")
      .update({
        vaga: editingIndicacao.vaga.trim(),
        empresa: editingIndicacao.empresa.trim(),
        data_acao: editingIndicacao.data_acao || DEFAULT_ACTION_DATE,
        resultado: editingIndicacao.resultado || null,
        jobhunter: editingIndicacao.jobhunter || null,
        vaga_link: editingIndicacao.vaga_link || null,
      })
      .eq("id", editingIndicacao.id);

    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
    } else {
      toast.success("Indicação atualizada.");
      setEditingIndicacao(null);
      await refetchIndicacoes();
    }
    setIsSavingIndicacao(false);
  };

  const handleDeleteIndicacao = async (indicacaoId: string) => {
    if (!window.confirm("Excluir esta indicação? Esta ação não pode ser desfeita.")) return;

    setDeletingIndicacaoId(indicacaoId);
    const { error } = await supabase.from("indicacoes").delete().eq("id", indicacaoId);

    if (error) {
      toast.error("Não foi possível excluir: " + error.message);
    } else {
      toast.success("Indicação excluída.");
      await refetchIndicacoes();
    }
    setDeletingIndicacaoId(null);
  };

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!candidato?.email) {
        setHasAccess(false);
        return;
      }

      try {
        const result = await getCandidateAccessStatus({ data: { email: candidato.email } });
        if (active) setHasAccess(result.hasAccess);
      } catch {
        if (active) setHasAccess(false);
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [candidato?.email]);

  const handleCreateAccess = async () => {
    if (!candidato?.email) return;
    setIsCreating(true);
    const pass = Math.random().toString(36).slice(-8);
    
    try {
      await createCandidateAccess({
        data: {
          email: candidato.email,
          password: pass,
        }
      });
      
      setTempPassword(pass);
      setPasswordAction("created");
      setHasAccess(true);
      toast.success("Acesso criado com sucesso!");
    } catch (error: any) {
      const message = error.message || "";
      if (message.includes("already registered") || message.includes("User already registered")) {
        setHasAccess(true);
        toast.info("Este candidato já tem acesso configurado.");
      } else {
        toast.error("Erro ao criar acesso: " + message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!candidato?.email || !hasAccess) return;
    setIsResettingPassword(true);
    const pass = Math.random().toString(36).slice(-8);

    try {
      await resetCandidatePassword({
        data: {
          email: candidato.email,
          password: pass,
        }
      });

      setTempPassword(pass);
      setPasswordAction("reset");
      toast.success("Senha resetada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao resetar senha: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoadingCandidato) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <AuthGuard>
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="LHH" className="w-[120px] h-auto" />
            <span className="h-6 w-px bg-border hidden sm:block" />
            <h1 className="text-lg font-bold text-[#333333] hidden sm:block">Painel Administrativo</h1>
          </div>
          <button
            onClick={() => window.location.href = "/admin"}
            className="flex items-center rounded-[6px] border border-border px-4 py-2 text-sm font-medium text-[#666666] transition hover:bg-gray-50"
          >
            <ArrowLeft size={18} className="mr-2" />
            Voltar
          </button>
        </div>
      </header>

      <div className="min-h-screen bg-[#F5F5F5] p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-border md:col-span-2 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-[#333333] tracking-tight">{candidato?.nome}</h1>

                  <p className="text-[#666666] font-medium">{candidato?.email || "E-mail não informado"}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs bg-[#F5F5F5] text-[#666666] px-3 py-1 rounded-full font-semibold border border-border">
                      {(candidato as any)?.area}
                    </span>
                    <span className="text-xs bg-[#F5F5F5] text-[#666666] px-3 py-1 rounded-full font-semibold border border-border">
                      {(candidato as any)?.nivel_cargo}
                    </span>
                    {(candidato as any)?.referral_id && (
                      <span className="text-xs bg-[#F0EBF5] text-primary px-3 py-1 rounded-full font-bold border border-[#D8C9E3]">
                        ID: {(candidato as any).referral_id}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">
                      Status do candidato
                    </Label>
                    <div className="flex items-center gap-3">
                      <Select
                        value={getStatusMeta(candidato?.status).value || undefined}
                        onValueChange={handleStatusChange}
                        disabled={isSavingStatus}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CANDIDATO_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusMeta(candidato?.status).badgeClass}`}
                      >
                        {getStatusMeta(candidato?.status).label}
                      </span>
                      {isSavingStatus && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                    <p className="text-xs text-[#666666]">
                      {getStatusMeta(candidato?.status).description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  {candidato?.email && hasAccess === false && !tempPassword && (
                    <Button 
                      onClick={handleCreateAccess} 
                      disabled={isCreating} 
                      className="bg-primary hover:bg-[#5A2574] text-white shadow-sm transition-all active:scale-95 rounded-[6px] px-6"
                    >
                      {isCreating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      Criar Acesso ao Portal
                    </Button>
                  )}
                  
                  {hasAccess && !tempPassword && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center gap-2 text-[#4CAF50] bg-green-50 px-4 py-2 rounded-lg border border-green-100 font-bold text-sm">
                        <CheckCircle size={18} />
                        Acesso já configurado
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetPassword}
                        disabled={isResettingPassword}
                        className="rounded-[6px] border-primary text-primary hover:bg-[#F0EBF5]"
                      >
                        {isResettingPassword ? <Loader2 className="animate-spin mr-2" size={16} /> : <KeyRound size={16} className="mr-2" />}
                        Resetar senha
                      </Button>
                    </div>
                  )}

                  {tempPassword && (
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in duration-300 max-w-sm">
                      <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                        <CheckCircle size={16} className="text-[#4CAF50]" />
                        {passwordAction === "reset" ? "Senha resetada!" : "Acesso criado!"}
                      </h3>
                      <p className="text-amber-800 text-xs mt-2 leading-relaxed">
                        Anote e envie estas credenciais ao candidato:
                      </p>
                      <div className="mt-3 space-y-2 bg-white/50 p-3 rounded-lg border border-amber-100">
                        <p className="text-xs text-[#666666] font-medium">E-mail: <span className="text-[#333333] select-all font-bold">{candidato?.email}</span></p>
                        <p className="text-xs text-[#666666] font-medium">Senha temporária: <span className="text-primary font-bold select-all text-sm">{tempPassword}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-gray-50">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest border-b pb-2">Dados Pessoais</h3>
                  <div className="space-y-3">
                    <DataField label="LinkedIn" value={(candidato as any)?.linkedin} isLink />
                    <DataField label="Idade" value={(candidato as any)?.idade} />
                    <DataField label="Local" value={(candidato as any)?.local_residencia} />
                    <DataField label="Mobilidade" value={(candidato as any)?.mobilidade} />
                    <DataField label="Telefone" value={candidato?.telefone} />
                    <DataField label="Relatório" value={(candidato as any)?.link_relatorio} isLink />
                    <DataField label="Currículo" value={(candidato as any)?.cv_candidato} isLink />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#666666] uppercase tracking-widest border-b pb-2">Perfil Profissional</h3>
                  <div className="space-y-3">
                    <DataField label="Última Posição" value={(candidato as any)?.ultima_posicao} />
                    <DataField label="Última Empresa" value={(candidato as any)?.ultima_empresa} />
                    <DataField label="Último Segmento" value={(candidato as any)?.ultimo_segmento} />
                    <DataField label="Posições Alvo" value={(candidato as any)?.posicoes_alvo} />
                    <DataField label="Segmento Alvo" value={(candidato as any)?.segmento_alvo} />
                    <DataField label="Empresas Alvo" value={(candidato as any)?.empresas_alvo} />
                    <DataField label="Remuneração" value={(candidato as any)?.pretensao_salarial || candidato?.ultimo_salario} />
                    <DataField label="Status Reunião" value={(candidato as any)?.reuniao_status} />
                    <DataField label="Observação" value={(candidato as any)?.observacao} />
                  </div>
                </section>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <p className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-1">Total Indicações</p>
                  <p className="text-4xl font-black text-primary">{indicacoes?.length || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-[#4CAF50]">
                <CardContent className="pt-6">
                  <p className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-1">Empresas Únicas</p>
                  <p className="text-4xl font-black text-[#4CAF50]">
                    {new Set(indicacoes?.map(i => i.empresa)).size}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-amber-400">
                <CardContent className="pt-6">
                  <p className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-1">Última Indicação</p>
                  <p className="text-xl font-bold text-[#333333]">
                    {formatActionDate(indicacoes?.[0]?.data_acao)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-[#FAFAFA]">
              <h2 className="font-bold text-[#333333] text-lg">Histórico de Indicações</h2>
              <span className="text-xs bg-white text-[#666666] px-4 py-1.5 rounded-full font-bold border border-border shadow-sm">
                {indicacoes?.length || 0} REGISTROS
              </span>
            </div>
            
            {isLoadingIndicacoes ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-primary" />
              </div>
            ) : (
              indicacoes && indicacoes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F5F5F5] text-[#666666] text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Vaga</th>
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-6 py-4 text-center">Data</th>
                        <th className="px-6 py-4">Resultado</th>
                        <th className="px-6 py-4">Conector</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {indicacoes.map((i, index) => (
                        <tr key={i.id} className={`transition-colors hover:bg-[#F0EBF5] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
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
                          <td className="px-6 py-4 text-sm text-[#666666] text-center font-medium">{formatActionDate(i.data_acao)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                              i.resultado?.toLowerCase().includes('entrevista') ? 'bg-green-100 text-[#4CAF50]' :
                              i.resultado?.toLowerCase().includes('cv enviado') ? 'bg-purple-100 text-primary' :
                              'bg-gray-100 text-[#666666]'
                            }`}>
                              {i.resultado || 'Sem retorno'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#666666] italic font-medium">{i.jobhunter || "-"}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Editar indicação"
                                onClick={() => setEditingIndicacao({ ...i })}
                              >
                                <Pencil size={16} className="text-primary" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Excluir indicação"
                                disabled={deletingIndicacaoId === i.id}
                                onClick={() => handleDeleteIndicacao(i.id)}
                              >
                                {deletingIndicacaoId === i.id ? (
                                  <Loader2 size={16} className="animate-spin text-[#666666]" />
                                ) : (
                                  <Trash2 size={16} className="text-[#E91E63]" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                    <Briefcase className="text-gray-300" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#333333] mb-1">Nenhuma indicação registrada</h3>
                  <p className="text-[#666666] max-w-xs mx-auto text-sm">Este candidato ainda não possui histórico de ações de mercado mapeadas.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editingIndicacao} onOpenChange={(open) => !open && setEditingIndicacao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar indicação</DialogTitle>
          </DialogHeader>

          {editingIndicacao && (
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-vaga">Vaga</Label>
                <Input
                  id="edit-vaga"
                  value={editingIndicacao.vaga ?? ""}
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, vaga: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-empresa">Empresa</Label>
                <Input
                  id="edit-empresa"
                  value={editingIndicacao.empresa ?? ""}
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, empresa: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-data">Data da ação</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={
                    editingIndicacao.data_acao && editingIndicacao.data_acao !== DEFAULT_ACTION_DATE
                      ? editingIndicacao.data_acao
                      : ""
                  }
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, data_acao: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-resultado">Resultado</Label>
                <Input
                  id="edit-resultado"
                  value={editingIndicacao.resultado ?? ""}
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, resultado: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-jobhunter">Conector</Label>
                <Input
                  id="edit-jobhunter"
                  value={editingIndicacao.jobhunter ?? ""}
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, jobhunter: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-link">Link da vaga</Label>
                <Input
                  id="edit-link"
                  value={editingIndicacao.vaga_link ?? ""}
                  onChange={(e) => setEditingIndicacao({ ...editingIndicacao, vaga_link: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIndicacao(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveIndicacao} disabled={isSavingIndicacao}>
              {isSavingIndicacao && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
