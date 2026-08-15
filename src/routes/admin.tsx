import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { LogOut, User, Users, Mail, MailWarning, Search, FileSpreadsheet, Loader2, Briefcase } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { useCandidatos, useAdminStats } from "@/hooks/use-candidatos";
import { ImportCandidatosModal } from "@/components/admin/import-modal";
import { ImportIndicacoesModal } from "@/components/admin/import-indicacoes-modal";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportIndicacoesModalOpen, setIsImportIndicacoesModalOpen] = useState(false);

  const { data: candidatos, isLoading: isLoadingCandidatos, refetch: refetchCandidatos } = useCandidatos(searchTerm);
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useAdminStats();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleImportSuccess = () => {
    refetchCandidatos();
    refetchStats();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <User size={16} className="mr-1.5" />
                <span>Logado como: {user?.email}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <FileSpreadsheet size={18} className="mr-2" />
                Importar Candidatos
              </Button>
              <Button
                onClick={() => setIsImportIndicacoesModalOpen(true)}
                variant="outline"
                className="border-violet-600 text-violet-600 hover:bg-violet-50"
              >
                <Briefcase size={18} className="mr-2" />
                Importar Indicações
              </Button>
              <button
                onClick={handleLogout}
                className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <LogOut size={18} className="mr-2" />
                Sair
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Candidatos</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.total || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Com E-mail</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.withEmail || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sem E-mail</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.withoutEmail || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <MailWarning className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Indicações</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin text-gray-300" /> : stats?.totalIndicacoes || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-violet-50 rounded-lg">
                    <Briefcase className="h-6 w-6 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Table */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Listagem de Candidatos</h2>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoadingCandidatos ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
                  <p className="text-gray-500">Carregando candidatos...</p>
                </div>
              ) : candidatos && candidatos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nível de Cargo</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatos.map((c) => (
                      <TableRow 
                        key={c.id} 
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-gray-900">{c.nome}</TableCell>
                        <TableCell className="text-gray-600">{c.email || "-"}</TableCell>
                        <TableCell className="text-gray-600">{c.area || "-"}</TableCell>
                        <TableCell className="text-gray-600">{c.nivel_cargo || "-"}</TableCell>
                        <TableCell className="text-gray-600">{c.consultor_responsavel || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            {c.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              console.log('Navigating to:', '/admin/candidato/' + c.id);
                              window.location.href = '/admin/candidato/' + c.id;
                            }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-500">
                    {searchTerm 
                      ? "Nenhum candidato encontrado para esta busca." 
                      : "Nenhum candidato cadastrado. Importe uma planilha para começar."}
                  </p>
                </div>
              )}
            </div>
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
    </AuthGuard>
  );
}
