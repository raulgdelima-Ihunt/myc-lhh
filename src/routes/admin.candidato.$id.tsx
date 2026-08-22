import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, Briefcase } from "lucide-react";
import { useCandidato, useCandidatoIndicacoes } from "@/hooks/use-candidato-data";
import { createCandidateAccess } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/candidato/$id")({
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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const { data: candidato, isLoading: isLoadingCandidato } = useCandidato(id);
  const { data: indicacoes, isLoading: isLoadingIndicacoes } = useCandidatoIndicacoes(id);

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
                </div>

                <div className="flex flex-col items-end gap-3">
                  {candidato?.email && !hasAccess && !tempPassword && (
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
                    <div className="flex items-center gap-2 text-[#4CAF50] bg-green-50 px-4 py-2 rounded-lg border border-green-100 font-bold text-sm">
                      <CheckCircle size={18} />
                      Acesso Configurado
                    </div>
                  )}

                  {tempPassword && (
                    <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in duration-300 max-w-sm">
                      <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                        <CheckCircle size={16} className="text-[#4CAF50]" />
                        Acesso criado!
                      </h3>
                      <p className="text-amber-800 text-xs mt-2 leading-relaxed">
                        Envie estas credenciais ao candidato para que ele possa acessar o portal:
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
                    {indicacoes?.[0]?.data_acao ? new Date(indicacoes[0].data_acao).toLocaleDateString('pt-BR') : '-'}
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
                        <th className="px-6 py-4">Jobhunter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {indicacoes.map((i, index) => (
                        <tr key={i.id} className={`transition-colors hover:bg-[#F0EBF5] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-[#333333]">{i.vaga}</td>
                          <td className="px-6 py-4 text-sm text-[#666666]">{i.empresa}</td>
                          <td className="px-6 py-4 text-sm text-[#666666] text-center font-medium">{i.data_acao}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                              i.resultado?.toLowerCase().includes('entrevista') ? 'bg-green-100 text-[#4CAF50]' :
                              i.resultado?.toLowerCase().includes('cv enviado') ? 'bg-purple-100 text-primary' :
                              'bg-gray-100 text-[#666666]'
                            }`}>
                              {i.resultado || 'Sem retorno'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#666666] italic font-medium">{i.jobhunter}</td>
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
    </AuthGuard>
  );
}
