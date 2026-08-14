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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-700 font-bold">
              <Briefcase size={24} />
              <span className="hidden sm:inline">PORTAL DE ACOMPANHAMENTO — LHH</span>
              <span className="sm:hidden">LHH Portal</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mb-4"></div>
              <p className="text-gray-500">Carregando seu portal...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Olá, {data?.candidato.nome}</h2>
                <p className="text-gray-500">Aqui você acompanha o progresso de suas indicações em tempo real.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-none shadow-sm bg-gradient-to-br from-violet-50 to-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-violet-600 uppercase">Total de Indicações</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                      <LayoutDashboard className="h-8 w-8 text-violet-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 uppercase">Empresas Diferentes</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.companies}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-600 uppercase">Indicações este Mês</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-emerald-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters & Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar vaga ou empresa..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-[160px]">
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
                      <SelectTrigger className="w-[180px]">
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
                      <thead className="bg-gray-50/50 text-gray-500 text-sm">
                        <tr>
                          <th className="px-6 py-4 font-semibold">VAGA</th>
                          <th className="px-6 py-4 font-semibold">EMPRESA</th>
                          <th className="px-6 py-4 font-semibold">DATA</th>
                          <th className="px-6 py-4 font-semibold text-right">RESULTADO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredIndicacoes.map((ind) => (
                          <tr key={ind.id} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{ind.vaga}</span>
                                {ind.vaga_link && (
                                  <a 
                                    href={ind.vaga_link} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-violet-600 hover:text-violet-800"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{ind.empresa}</td>
                            <td className="px-6 py-4 text-gray-600 text-sm">
                              {ind.data_acao ? new Date(ind.data_acao).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                ind.resultado?.toLowerCase().includes('aprovado') ? 'bg-green-100 text-green-700' :
                                ind.resultado?.toLowerCase().includes('reprovado') ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {ind.resultado || 'Em análise'}
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
