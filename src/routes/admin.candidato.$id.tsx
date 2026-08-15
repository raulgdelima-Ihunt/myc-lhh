import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useCandidato, useCandidatoIndicacoes } from "@/hooks/use-candidato-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/candidato/$id")({
  component: CandidatoDetail,
});

function CandidatoDetail() {
  const { id } = useParams({ from: "/admin/candidato/$id" });
  const [isCreating, setIsCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const { data: candidato, isLoading: isLoadingCandidato } = useCandidato(id);
  const { data: indicacoes, isLoading: isLoadingIndicacoes } = useCandidatoIndicacoes(id);

  useEffect(() => {
    async function checkAccess() {
      if (candidato?.email) {
        const { data } = await supabase.rpc('has_role_by_email', { _email: candidato.email });
        // Since we don't have this RPC yet, let's just try to check if a user with this email exists in auth.users
        // But we can't query auth.users directly. 
        // A better way is to check if they are in user_roles if we linked them.
        // For now, let's use a simpler approach: if signUp fails with "already registered", they have access.
      }
    }
    checkAccess();
  }, [candidato]);

  const handleCreateAccess = async () => {
    if (!candidato?.email) return;
    setIsCreating(true);
    const pass = Math.random().toString(36).slice(-8);
    
    const { data, error } = await supabase.auth.signUp({
      email: candidato.email,
      password: pass,
    });

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setHasAccess(true);
        toast.info("Este candidato já tem acesso configurado.");
      } else {
        toast.error("Erro ao criar acesso: " + error.message);
      }
    } else {
      setTempPassword(pass);
      setHasAccess(true);
      toast.success("Acesso criado com sucesso!");
    }
    setIsCreating(false);
  };

  if (isLoadingCandidato) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <AuthGuard>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => window.location.href = "/admin"} className="mb-4">
          <ArrowLeft className="mr-2" /> Voltar
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start md:col-span-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{candidato?.nome}</h1>
              <p className="text-gray-500">{candidato?.email || "E-mail não informado"}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{candidato?.area}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{candidato?.nivel_cargo}</span>
              </div>
              <p className="text-xs text-gray-400 mt-4 font-medium uppercase tracking-wider">Consultor Responsável</p>
              <p className="text-sm text-gray-700">{candidato?.consultor_responsavel || "-"}</p>
            </div>

            <div className="flex flex-col items-end gap-3">
              {candidato?.email && !hasAccess && !tempPassword && (
                <Button onClick={handleCreateAccess} disabled={isCreating} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95">
                  {isCreating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Criar acesso
                </Button>
              )}
              
              {hasAccess && !tempPassword && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100 font-medium text-sm">
                  <CheckCircle size={18} />
                  Acesso já configurado
                </div>
              )}

              {tempPassword && (
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm animate-in zoom-in duration-300 max-w-sm">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    Acesso criado!
                  </h3>
                  <p className="text-amber-800 text-xs mt-2 leading-relaxed">
                    Envie estas credenciais ao candidato para que ele possa acessar o portal:
                  </p>
                  <div className="mt-3 space-y-2 bg-white/50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-gray-600 font-medium">E-mail: <span className="text-gray-900 select-all">{candidato?.email}</span></p>
                    <p className="text-xs text-gray-600 font-medium">Senha temporária: <span className="text-violet-700 font-bold select-all">{tempPassword}</span></p>
                  </div>
                  <p className="text-[10px] text-amber-700 mt-3 italic">
                    * Recomende que o candidato altere a senha após o primeiro acesso.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Indicações</p>
                <p className="text-3xl font-black text-violet-600">{indicacoes?.length || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Empresas Únicas</p>
                <p className="text-3xl font-black text-blue-600">
                  {new Set(indicacoes?.map(i => i.empresa)).size}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Última Indicação</p>
                <p className="text-xl font-bold text-gray-800">
                  {indicacoes?.[0]?.data_acao ? new Date(indicacoes[0].data_acao).toLocaleDateString('pt-BR') : '-'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Histórico de Indicações</h2>
            <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full font-medium border border-gray-100">
              {indicacoes?.length || 0} registros
            </span>
          </div>
          {isLoadingIndicacoes ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-violet-500" />
            </div>
          ) : (
            indicacoes && indicacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Vaga</th>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4 text-center">Data</th>
                      <th className="px-6 py-4">Resultado</th>
                      <th className="px-6 py-4">Jobhunter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {indicacoes.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{i.vaga}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{i.empresa}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">{i.data_acao}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            i.resultado?.toLowerCase().includes('entrevista') ? 'bg-green-100 text-green-700' :
                            i.resultado?.toLowerCase().includes('cv enviado') ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {i.resultado || 'Sem retorno'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 italic">{i.jobhunter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center">
                <p className="text-gray-400 text-sm">Nenhuma indicação registrada para este candidato.</p>
              </div>
            )
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
