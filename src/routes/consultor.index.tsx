import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useMyRole, useConsultorCarteira } from "@/hooks/use-consultor";
import { getStatusMeta } from "@/lib/candidato-status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogOut, Search, Loader2, Users, Briefcase } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/consultor/")({
  head: () => ({
    meta: [
      { title: "Minha Carteira | MyCareer by LHH" },
      { name: "description", content: "Acompanhe os candidatos da sua carteira e suas indicações." },
      { property: "og:title", content: "Minha Carteira | MyCareer by LHH" },
      { property: "og:description", content: "Acompanhe os candidatos da sua carteira e suas indicações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsultorPage,
});

function ConsultorPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: roleData } = useMyRole(user?.id);
  const { data: carteira, isLoading } = useConsultorCarteira(Boolean(user));

  const filtered = useMemo(() => {
    if (!carteira) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return carteira;
    return carteira.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [carteira, searchTerm]);

  const totalIndicacoes = useMemo(
    () => (carteira ?? []).reduce((sum, c) => sum + c.totalIndicacoes, 0),
    [carteira],
  );

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F5F5] p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between rounded-xl border border-border bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="LHH" className="h-auto w-[120px]" />
              <div>
                <h1 className="text-2xl font-bold text-[#333333]">Minha Carteira</h1>
                <p className="mt-1 text-sm text-[#666666]">
                  {roleData?.nome_consultor || user?.email}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="rounded-[6px]">
              <LogOut size={18} className="mr-2" />
              Sair
            </Button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-[#666666]">
                    Candidatos na carteira
                  </p>
                  <p className="text-3xl font-bold text-primary">{carteira?.length || 0}</p>
                </div>
                <Users className="h-6 w-6 text-primary" />
              </CardContent>
            </Card>
            <Card className="border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-[#666666]">
                    Total de indicações
                  </p>
                  <p className="text-3xl font-bold text-primary">{totalIndicacoes}</p>
                </div>
                <Briefcase className="h-6 w-6 text-primary" />
              </CardContent>
            </Card>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-4 border-b border-border p-6">
              <h2 className="text-lg font-semibold text-[#333333]">Candidatos</h2>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                <p className="text-gray-500">Carregando sua carteira...</p>
              </div>
            ) : filtered.length > 0 ? (
              <Table>
                <TableHeader className="bg-[#F5F5F5]">
                  <TableRow>
                    <TableHead className="font-semibold">Referral</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Total Indicações</TableHead>
                    <TableHead className="font-semibold">Última Indicação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, index) => {
                    const statusMeta = getStatusMeta(c.status);
                    return (
                      <TableRow
                        key={c.id}
                        className={`cursor-pointer transition-colors hover:bg-[#F0EBF5] ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                        onClick={() => navigate({ to: "/consultor/candidato/$id", params: { id: c.id } })}
                      >
                        <TableCell className="font-medium text-[#333333]">{c.nome}</TableCell>
                        <TableCell className="text-[#666666]">
                          {c.email || <span className="text-sm italic text-gray-300">Sem e-mail</span>}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#666666]">{c.totalIndicacoes}</TableCell>
                        <TableCell className="text-[#666666]">
                          {c.ultimaIndicacao
                            ? new Date(c.ultimaIndicacao).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                Nenhum candidato vinculado à sua carteira.
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
