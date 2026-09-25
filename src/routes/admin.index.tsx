import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User, Users, Mail, MailWarning, Search, FileSpreadsheet, Loader2, Briefcase, UserCog, Network, CopyX } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCandidatos, useAdminStats } from "@/hooks/use-candidatos";
import { ImportCandidatosModal } from "@/components/admin/import-modal";
import { ImportIndicacoesModal } from "@/components/admin/import-indicacoes-modal";
import { CreateConsultorModal } from "@/components/admin/create-consultor-modal";
import { ConectoresModal } from "@/components/admin/conectores-modal";
import { DuplicatasModal } from "@/components/admin/duplicatas-modal";
import { CANDIDATO_STATUS_OPTIONS, getStatusMeta } from "@/lib/candidato-status";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Admin | MyCareer by LHH" },
      { name: "description", content: "Administração do Portal MyCareer by LHH." },
      { property: "og:title", content: "Painel Admin | MyCareer by LHH" },
      { property: "og:description", content: "Administração do Portal MyCareer by LHH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consultorFilter, setConsultorFilter] = useState("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportIndicacoesModalOpen, setIsImportIndicacoesModalOpen] = useState(false);
  const [isConsultorModalOpen, setIsConsultorModalOpen] = useState(false);
  const [isConectoresModalOpen, setIsConectoresModalOpen] = useState(false);
  const [isDuplicatasModalOpen, setIsDuplicatasModalOpen] = useState(false);

  const { data: candidatos, isLoading: isLoadingCandidatos, refetch: refetchCandidatos } = useCandidatos(searchTerm);
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useAdminStats();

  const filteredCandidatos = useMemo(() => {
    if (!candidatos) return [];
    return candidatos.filter((c) => {
      const st = String(c.status || "").trim().toLowerCase();
      const matchesStatus =
        statusFilter === "all" ? st !== "duplicado" : st === statusFilter;
      const matchesConsultor =
        consultorFilter === "all" ||
        (c.consultor_responsavel || "").trim() === consultorFilter;
      return matchesStatus && matchesConsultor;
    });
  }, [candidatos, statusFilter, consultorFilter]);

  const filtrosAtivos =
    searchTerm.trim() !== "" || statusFilter !== "all" || consultorFilter !== "all";

  const totalExibindo = useMemo(() => {
    return filteredCandidatos.length;
  }, [filteredCandidatos.length]);

  const consultorResumo = useMemo(() => {
    if (consultorFilter === "all" || !candidatos) return null;
    const ativos = candidatos.filter(
      (c) =>
        (c.consultor_responsavel || "").trim() === consultorFilter &&
        String(c.status || "").trim().toLowerCase() === "ativo",
    ).length;
    return { nome: consultorFilter, ativos };
  }, [candidatos, consultorFilter]);

  const consultores = useMemo(() => {
    const names = new Set(
      (candidatos ?? [])
        .map((c) => (c.consultor_responsavel || "").trim())
        .filter((name) => name.length > 0),
    );
    return Array.from(names).sort();
  }, [candidatos]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleImportSuccess = () => {
    refetchCandidatos();
    refetchStats();
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-border mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="LHH" className="w-[120px] h-auto" />
            <div>
              <h1 className="text-2xl font-bold text-[#333333]">Painel Administrativo</h1>
              <div className="mt-1 flex items-center text-sm text-[#666666]">
                <User size={16} className="mr-1.5" />
                <span>Logado como: {user?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setIsConsultorModalOpen(true)}
              variant="outline"
              className="border-primary text-primary hover:bg-[#F0EBF5] rounded-[6px]"
            >
              <UserCog size={18} className="mr-2" />
              Criar acesso consultor
            </Button>
            <Button
              onClick={() => setIsConectoresModalOpen(true)}
              variant="outline"
              className="border-primary text-primary hover:bg-[#F0EBF5] rounded-[6px]"
            >
              <Network size={18} className="mr-2" />
              Conectores
            </Button>
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-primary hover:bg-[#5A2574] text-white rounded-[6px]"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Importar Candidatos
            </Button>
            <Button
              onClick={() => setIsImportIndicacoesModalOpen(true)}
              variant="outline"
              className="border-primary text-primary hover:bg-[#F0EBF5] rounded-[6px]"
            >
              <Briefcase size={18} className="mr-2" />
              Importar Indicações
            </Button>
            <button
              onClick={handleLogout}
              className="flex items-center rounded-[6px] border border-border px-4 py-2 text-sm font-medium text-[#666666] transition hover:bg-gray-50"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#666666] uppercase tracking-wider">Total de Candidatos</p>
                  <p className="text-3xl font-bold text-primary">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.total || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#666666] uppercase tracking-wider">Com E-mail</p>
                  <p className="text-3xl font-bold text-primary">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.withEmail || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#666666] uppercase tracking-wider">Sem E-mail</p>
                  <p className="text-3xl font-bold text-primary">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.withoutEmail || 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <MailWarning className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#666666] uppercase tracking-wider">Total de Indicações</p>
                  <p className="text-3xl font-bold text-primary">
                    {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.totalIndicacoes || 0}
                  </p>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Table */}
        <div className="rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#333333]">Listagem de Candidatos</h2>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {CANDIDATO_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="duplicado">Duplicado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os consultores</SelectItem>
                  {consultores.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {consultorResumo && (
            <div className="px-6 py-3 border-b border-border bg-[#F0EBF5]">
              <p className="text-sm font-medium text-primary">
                Consultor: {consultorResumo.nome} — {consultorResumo.ativos} candidatos ativos
              </p>
            </div>
          )}

          {!isLoadingCandidatos && (
            <div className="flex justify-end px-6 pt-4 pb-1">
              <p className="text-sm text-[#666666]">
                Exibindo {totalExibindo} {totalExibindo === 1 ? "candidato" : "candidatos"}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            {isLoadingCandidatos ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
                <p className="text-gray-500">Carregando candidatos...</p>
              </div>
            ) : filteredCandidatos.length > 0 ? (
              <Table>
                <TableHeader className="bg-[#F5F5F5]">
                  <TableRow>
                    <TableHead className="font-semibold">Referral</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Área</TableHead>
                    <TableHead className="font-semibold">Nível de Cargo</TableHead>
                    <TableHead className="font-semibold">Consultor</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidatos.map((c, index) => {
                    const statusMeta = getStatusMeta(c.status);
                    return (
                      <TableRow 
                        key={c.id} 
                        className={`cursor-pointer transition-colors hover:bg-[#F0EBF5] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                        onClick={() => window.location.href = '/admin/candidato/' + c.id}
                      >
                        <TableCell className="text-[#666666]">{c.referral_id || "-"}</TableCell>
                        <TableCell className="font-medium text-[#333333]">{c.nome}</TableCell>
                        <TableCell className="text-[#666666]">
                          {c.email ? c.email : <span className="text-gray-300 italic text-sm">Sem e-mail</span>}
                        </TableCell>
                        <TableCell className="text-[#666666]">{c.area || "-"}</TableCell>
                        <TableCell className="text-[#666666]">{c.nivel_cargo || "-"}</TableCell>
                        <TableCell className="text-[#666666]">{c.consultor_responsavel || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== "all"
                    ? "Nenhum candidato encontrado para esta busca." 
                    : "Nenhum candidato cadastrado. Importe uma planilha para começar."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImportCandidatosModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={handleImportSuccess}
      />
      <ImportIndicacoesModal 
        isOpen={isImportIndicacoesModalOpen} 
        onClose={() => setIsImportIndicacoesModalOpen(false)} 
        onSuccess={handleImportSuccess}
      />
      <CreateConsultorModal
        isOpen={isConsultorModalOpen}
        onClose={() => setIsConsultorModalOpen(false)}
        consultores={consultores}
      />
      <ConectoresModal
        isOpen={isConectoresModalOpen}
        onClose={() => setIsConectoresModalOpen(false)}
      />
    </div>
  );
}
