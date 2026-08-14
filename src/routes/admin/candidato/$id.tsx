import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
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
        <Button variant="ghost" onClick={() => navigate({ to: "/admin" })} className="mb-4">
          <ArrowLeft className="mr-2" /> Voltar
        </Button>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{candidato?.nome}</h1>
            <p className="text-gray-500">{candidato?.email}</p>
            <p className="text-sm mt-2">{candidato?.area} | {candidato?.nivel_cargo}</p>
            <p className="text-sm text-gray-500">Consultor: {candidato?.consultor_responsavel}</p>
          </div>

          {candidato?.email && !tempPassword && (
            <Button onClick={handleCreateAccess} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar acesso"}
            </Button>
          )}
          {tempPassword && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="font-semibold text-green-800">Acesso criado!</p>
              <p className="text-green-700">Senha temporária: <span className="font-mono bg-white px-1">{tempPassword}</span></p>
            </div>
          )}
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
