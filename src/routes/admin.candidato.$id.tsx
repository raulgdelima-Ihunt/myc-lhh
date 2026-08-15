import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useCandidato, useCandidatoIndicacoes } from "@/hooks/use-candidato-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/candidato/$id")({
  component: CandidatoDetail,
});

function CandidatoDetail() {
  const { id } = useParams({ from: "/admin/candidato/$id" });
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: candidato, isLoading: isLoadingCandidato } = useCandidato(id);
  const { data: indicacoes, isLoading: isLoadingIndicacoes } = useCandidatoIndicacoes(id);

  const handleCreateAccess = async () => {
    if (!candidato?.email) return;
    setIsCreating(true);
    const pass = Math.random().toString(36).slice(-8);
    
    const { data, error } = await supabase.auth.signUp({
      email: candidato.email,
      password: pass,
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Este candidato já tem acesso!");
      } else {
        toast.error("Erro ao criar acesso: " + error.message);
      }
    } else {
      setTempPassword(pass);
      toast.success("Acesso criado com sucesso!");
    }
    setIsCreating(false);
  };

  if (isLoadingCandidato) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <AuthGuard>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <p className="bg-yellow-100 p-2 text-yellow-800 text-xs rounded border border-yellow-200">
          DEBUG: Esta página carregou. ID recebido: {id}
        </p>
        <Button variant="ghost" onClick={() => window.location.href = "/admin"} className="mb-4">
          <ArrowLeft className="mr-2" /> Voltar
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start md:col-span-2">
            <div>
              <h1 className="text-2xl font-bold">{candidato?.nome}</h1>
              <p className="text-gray-500">{candidato?.email}</p>
              <p className="text-sm mt-2">{candidato?.area} | {candidato?.nivel_cargo}</p>
              <p className="text-sm text-gray-500">Consultor: {candidato?.consultor_responsavel}</p>
            </div>

            <div className="flex flex-col items-end gap-3">
              {candidato?.email && !tempPassword && (
                <Button onClick={handleCreateAccess} disabled={isCreating} className="bg-violet-600 hover:bg-violet-700">
                  {isCreating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Criar acesso
                </Button>
              )}
              {tempPassword && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 animate-in fade-in zoom-in duration-300">
                  <p className="font-semibold text-green-800 text-sm">Acesso criado!</p>
                  <p className="text-green-700 text-xs mt-1">Senha temporária:</p>
                  <p className="font-mono bg-white px-2 py-1 rounded border border-green-200 mt-1 text-center font-bold">{tempPassword}</p>
                  <p className="text-[10px] text-green-600 mt-2 max-w-[150px]">Anote e envie ao candidato agora.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Indicações</p>
                <p className="text-2xl font-bold text-gray-900">{indicacoes?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Empresas Únicas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(indicacoes?.map(i => i.empresa)).size}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Última Indicação</p>
                <p className="text-lg font-bold text-gray-900">
                  {indicacoes?.[0]?.data_acao ? new Date(indicacoes[0].data_acao).toLocaleDateString('pt-BR') : '-'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 font-semibold">Indicações</div>
          {isLoadingIndicacoes ? <Loader2 className="animate-spin mx-auto my-8" /> : (
            indicacoes && indicacoes.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4">Vaga</th>
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Resultado</th>
                    <th className="p-4">Jobhunter</th>
                  </tr>
                </thead>
                <tbody>
                  {indicacoes.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="p-4">{i.vaga}</td>
                      <td className="p-4">{i.empresa}</td>
                      <td className="p-4">{i.data_acao}</td>
                      <td className="p-4">{i.resultado}</td>
                      <td className="p-4">{i.jobhunter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="p-8 text-center text-gray-500">Nenhuma indicação registrada para este candidato</p>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
