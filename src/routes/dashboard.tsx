import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { LogOut, Search, Briefcase, Building2, Calendar, LayoutDashboard, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { useCandidateDashboard } from "@/hooks/use-candidato-data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const { data, isLoading, error } = useCandidateDashboard(user?.email || "");

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const filteredIndicacoes = useMemo(() => {
    if (!data?.indicacoes) return [];
    
    return data.indicacoes.filter(ind => {
      const matchesSearch = ind.vaga.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           ind.empresa.toLowerCase().includes(searchTerm.toLowerCase());
      
      const date = ind.data_acao ? new Date(ind.data_acao) : null;
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
      const d = i.data_acao ? new Date(i.data_acao) : null;
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
      const d = ind.data_acao ? new Date(ind.data_acao) : null;
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

            <button
              onClick={handleLogout}
              className="flex items-center rounded-[6px] border border-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </button>
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
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#333333]">Olá, {data?.candidato.nome}</h2>
                <p className="text-[#666666]">Aqui você acompanha o progresso de suas indicações em tempo real.</p>
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
                              {ind.data_acao ? new Date(ind.data_acao).toLocaleDateString('pt-BR') : '-'}
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
            © 2026 LHH Recruitment Portal
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
