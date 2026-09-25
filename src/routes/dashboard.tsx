import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { LogOut, Search, Briefcase, Building2, Calendar, LayoutDashboard, ExternalLink, KeyRound, Send, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCandidateDashboard } from "@/hooks/use-candidato-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStatusMeta, isStatusEncerrado } from "@/lib/candidato-status";

const DEFAULT_ACTION_DATE = "1900-01-01";

function formatActionDate(date: string | null | undefined) {
  if (!date || date === DEFAULT_ACTION_DATE) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu Dashboard | MyCareer by LHH" },
      { name: "description", content: "Acompanhe suas indicações de mercado em tempo real." },
      { property: "og:title", content: "Meu Dashboard | MyCareer by LHH" },
      { property: "og:description", content: "Acompanhe suas indicações de mercado em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isReforcoOpen, setIsReforcoOpen] = useState(false);
  const [reforcoTitulo, setReforcoTitulo] = useState("");
  const [reforcoEmpresa, setReforcoEmpresa] = useState("");
  const [reforcoLink, setReforcoLink] = useState("");
  const [reforcoObs, setReforcoObs] = useState("");
  const [isSendingReforco, setIsSendingReforco] = useState(false);
  const [reforcoEnviado, setReforcoEnviado] = useState(false);

  const { data, isLoading, error } = useCandidateDashboard(user?.email || "");

  const { data: conector } = useQuery({
    queryKey: ["conector", data?.candidato.conector_id],
    enabled: !!data?.candidato.conector_id,
    queryFn: async () => {
      const { data: c } = await supabase
        .from("conectores")
        .select("nome, email")
        .eq("id", data!.candidato.conector_id!)
        .maybeSingle();
      return c;
    },
  });

  const handleEnviarReforco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.candidato.id) return;
    setIsSendingReforco(true);
    const { error: insertError } = await supabase.from("solicitacoes_reforco").insert({
      candidato_id: data.candidato.id,
      titulo_vaga: reforcoTitulo.trim(),
      empresa: reforcoEmpresa.trim(),
      link_vaga: reforcoLink.trim() || null,
      observacoes: reforcoObs.trim() || null,
    });
    setIsSendingReforco(false);
    if (insertError) {
      toast.error("Não foi possível registrar a solicitação. Tente novamente.");
      return;
    }
    setReforcoEnviado(true);
  };

  const closeReforcoModal = () => {
    setIsReforcoOpen(false);
    setReforcoEnviado(false);
    setReforcoTitulo("");
    setReforcoEmpresa("");
    setReforcoLink("");
    setReforcoObs("");
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setIsUpdatingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      toast.error("Não foi possível alterar a senha. Tente novamente.");
    } else {
      toast.success("Senha alterada com sucesso.");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
    }

    setIsUpdatingPassword(false);
  };

  const filteredIndicacoes = useMemo(() => {
    if (!data?.indicacoes) return [];
    
    return data.indicacoes.filter(ind => {
      const matchesSearch = ind.vaga.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           ind.empresa.toLowerCase().includes(searchTerm.toLowerCase());
      
      const date = ind.data_acao && ind.data_acao !== DEFAULT_ACTION_DATE ? new Date(ind.data_acao) : null;
      const month = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null;
      const matchesMonth = monthFilter === "all" || month === monthFilter;
      
      const matchesCompany = companyFilter === "all" || ind.empresa === companyFilter;
      
      return matchesSearch && matchesMonth && matchesCompany;
    });
  }, [data?.indicacoes, searchTerm, monthFilter, companyFilter]);

  const stats = useMemo(() => {
    if (!data?.indicacoes) return { total: 0, companies: 0, thisMonth: 0 };
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const uniqueCompanies = new Set(data.indicacoes.map(i => i.empresa));
    const thisMonthIndications = data.indicacoes.filter(i => {
      const d = i.data_acao && i.data_acao !== DEFAULT_ACTION_DATE ? new Date(i.data_acao) : null;
      return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
    });

    return {
      total: data.indicacoes.length,
      companies: uniqueCompanies.size,
      thisMonth: thisMonthIndications.length
    };
  }, [data?.indicacoes]);

  const uniqueMonths = useMemo(() => {
    if (!data?.indicacoes) return [];
    const months = new Set(data.indicacoes.map(ind => {
      const d = ind.data_acao && ind.data_acao !== DEFAULT_ACTION_DATE ? new Date(ind.data_acao) : null;
      return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
    }).filter(Boolean));
    return Array.from(months).sort().reverse();
  }, [data?.indicacoes]);

  const uniqueCompanies = useMemo(() => {
    if (!data?.indicacoes) return [];
    return Array.from(new Set(data.indicacoes.map(i => i.empresa))).sort();
  }, [data?.indicacoes]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
        <h2 className="text-xl font-bold text-red-600 mb-2">Acesso não autorizado</h2>
        <p className="text-gray-600">Entre em contato com seu consultor para ativar seu acesso.</p>
        <Button variant="outline" onClick={handleLogout} className="mt-4">Voltar</Button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        {/* Header */}
        <header className="bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.svg" 
                alt="MyCareer by LHH" 
                className="w-[120px] h-auto brightness-0 invert" 
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPasswordModalOpen(true)}
                className="h-9 rounded-[6px] px-3 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
              >
                <KeyRound size={16} />
                Alterar senha
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="h-9 rounded-[6px] border-white/20 bg-transparent px-3 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-[#666666]">Carregando seu portal...</p>
            </div>
          ) : (
            <>
              {isStatusEncerrado(data?.candidato.status) && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="text-sm font-bold text-amber-900">
                    {data?.candidato.status === "declinado"
                      ? "Programa cancelado"
                      : "Programa encerrado"}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">
                    Seu programa não está mais ativo ({getStatusMeta(data?.candidato.status).label}).
                    Você continua com acesso ao histórico das suas indicações. Para retomar o
                    acompanhamento, fale com seu consultor.
                  </p>
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#333333]">Olá, {data?.candidato.nome}</h2>
                <p className="text-[#666666]">Aqui você acompanha o progresso de suas indicações em tempo real.</p>
                <div className="mt-3">
                  <p className="text-sm font-medium text-[#333333]">
                    Seu Conector: {conector ? conector.nome : "não atribuído"}
                  </p>
                  {conector?.email && (
                    <p className="text-sm text-[#666666]">{conector.email}</p>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-[#6B2D8B]">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#666666] uppercase">Total de Indicações</p>
                        <p className="text-3xl font-bold text-[#333333]">{stats.total}</p>
                      </div>
                      <LayoutDashboard className="h-8 w-8 text-[#6B2D8B]/20" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-[#4CAF50]">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#666666] uppercase">Empresas Diferentes</p>
                        <p className="text-3xl font-bold text-[#333333]">{stats.companies}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-[#4CAF50]/20" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white border-l-4 border-l-[#E91E63]">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#666666] uppercase">Indicações este Mês</p>
                        <p className="text-3xl font-bold text-[#333333]">{stats.thisMonth}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-[#E91E63]/20" />
                    </div>
                  </CardContent>
                </Card>
              </div>


              {/* Banner links expirados */}
              <div className="mb-6 flex items-start gap-3 rounded-[6px] border-l-4 border-[#FF9800] bg-[#FFF3E0] p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9800]" />
                <p className="text-sm text-[#333333]">
                  Os links das vagas publicadas podem expirar sem aviso prévio, pois dependem da
                  disponibilidade no site da empresa. Caso um link não funcione, entre em contato
                  com seu conector.
                </p>
              </div>

              {/* Filters & Table */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-border overflow-hidden">
                <div className="p-6 border-b border-border space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666] h-4 w-4" />
                    <Input
                      placeholder="Buscar vaga ou empresa..."
                      className="pl-10 focus:ring-primary focus:border-primary"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => setIsReforcoOpen(true)}
                      className="h-10 rounded-[6px] bg-[#6B2D8B] px-4 text-sm font-medium text-white hover:bg-[#5a2576]"
                    >
                      <Send size={16} />
                      Solicitar Reforço de Candidatura
                    </Button>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-[160px] focus:ring-primary">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {uniqueMonths.map(m => (
                          <SelectItem key={m} value={m || ""}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="w-[180px] focus:ring-primary">
                        <SelectValue placeholder="Empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas empresas</SelectItem>
                        {uniqueCompanies.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredIndicacoes.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#F5F5F5] text-[#666666] text-sm">
                        <tr>
                          <th className="px-6 py-4 font-semibold">VAGA</th>
                          <th className="px-6 py-4 font-semibold">EMPRESA</th>
                          <th className="px-6 py-4 font-semibold">DATA</th>
                          <th className="px-6 py-4 font-semibold text-right">RESULTADO</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {filteredIndicacoes.map((ind, index) => (
                          <tr key={ind.id} className={`transition-colors hover:bg-[#F0EBF5] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {ind.vaga_link ? (
                                  <a 
                                    href={ind.vaga_link} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="font-medium text-primary hover:underline flex items-center gap-1 group"
                                  >
                                    {ind.vaga}
                                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                ) : (
                                  <span className="font-medium text-[#333333]">{ind.vaga}</span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-[#666666]">{ind.empresa}</td>
                            <td className="px-6 py-4 text-[#666666] text-sm">
                              {formatActionDate(ind.data_acao)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                ind.resultado?.toLowerCase().includes('entrevista') ? 'bg-green-100 text-[#4CAF50]' :
                                ind.resultado?.toLowerCase().includes('cv enviado') ? 'bg-purple-100 text-primary' :
                                (ind.resultado?.toLowerCase().includes('não indicado') || ind.resultado?.toLowerCase().includes('perfil não aderente')) ? 'bg-gray-100 text-[#666666]' :
                                (!ind.resultado || ind.resultado.toLowerCase().includes('sem retorno')) ? 'bg-gray-50 text-gray-400' :
                                'bg-gray-100 text-[#333333]'
                              }`}>
                                {ind.resultado || 'Sem retorno'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  ) : (
                    <div className="p-16 text-center">
                      <div className="bg-violet-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="text-violet-400" size={32} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {searchTerm || monthFilter !== 'all' || companyFilter !== 'all' ? 'Nenhuma indicação encontrada' : 'Ainda não há indicações'}
                      </h3>
                      <p className="text-gray-500 max-w-xs mx-auto">
                        {searchTerm || monthFilter !== 'all' || companyFilter !== 'all' 
                          ? 'Tente ajustar seus filtros para encontrar o que procura.'
                          : 'Sua equipe está trabalhando nisso! Assim que novas oportunidades surgirem, elas aparecerão aqui.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="bg-white border-t border-gray-100 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            @2026 LHH MyCareer Portal
          </div>
        </footer>

        <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar senha</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                type="password"
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isUpdatingPassword}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isReforcoOpen} onOpenChange={(open) => (open ? setIsReforcoOpen(true) : closeReforcoModal())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Reforço de Candidatura</DialogTitle>
            </DialogHeader>
            {reforcoEnviado ? (
              <div className="space-y-4">
                <div className="rounded-[6px] border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-[#333333]">
                    {conector
                      ? `Solicitação registrada. Para agilizar, envie os detalhes diretamente para seu conector: ${conector.nome} — ${conector.email}`
                      : "Solicitação registrada. Entre em contato com a equipe MyCareer para acompanhamento."}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={closeReforcoModal}>Fechar</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnviarReforco} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#333333]">Título da Vaga *</label>
                  <Input
                    value={reforcoTitulo}
                    onChange={(e) => setReforcoTitulo(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#333333]">Empresa *</label>
                  <Input
                    value={reforcoEmpresa}
                    onChange={(e) => setReforcoEmpresa(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#333333]">Link da Vaga (opcional)</label>
                  <Input
                    type="url"
                    value={reforcoLink}
                    onChange={(e) => setReforcoLink(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#333333]">
                    Observações — por que você é aderente a esta posição (opcional)
                  </label>
                  <Textarea
                    value={reforcoObs}
                    onChange={(e) => setReforcoObs(e.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeReforcoModal} disabled={isSendingReforco}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSendingReforco}
                    className="bg-[#6B2D8B] text-white hover:bg-[#5a2576]"
                  >
                    {isSendingReforco ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
