import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Registro = {
  id: string;
  nome: string;
  email: string | null;
  referral_id: string | null;
  status: string | null;
  created_at: string | null;
  indicacoes: number;
};

type Grupo = { email: string; registros: Registro[]; mesclavel: boolean };

const normEmail = (e: string | null) => String(e || "").trim().toLowerCase();

async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function escolherPrincipal(registros: Registro[]) {
  const comRef = registros
    .filter((r) => r.referral_id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return comRef[0] ?? null;
}

export function DuplicatasModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [resumo, setResumo] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const cands = await fetchAll<any>((f, t) =>
        supabase
          .from("candidatos")
          .select("id, nome, email, referral_id, status, created_at")
          .not("email", "is", null)
          .range(f, t),
      );
      const inds = await fetchAll<any>((f, t) =>
        supabase.from("indicacoes").select("candidato_id").range(f, t),
      );
      const count = new Map<string, number>();
      inds.forEach((i) => i.candidato_id && count.set(i.candidato_id, (count.get(i.candidato_id) ?? 0) + 1));

      const map = new Map<string, Registro[]>();
      cands.forEach((c) => {
        if (String(c.status || "").toLowerCase() === "duplicado") return;
        const e = normEmail(c.email);
        if (!e) return;
        const arr = map.get(e) ?? [];
        arr.push({ ...c, indicacoes: count.get(c.id) ?? 0 });
        map.set(e, arr);
      });
      const gs: Grupo[] = [];
      map.forEach((registros, email) => {
        if (registros.length < 2) return;
        const principal = escolherPrincipal(registros);
        const mesclavel = !!principal && registros.some((r) => !r.referral_id);
        gs.push({ email, registros, mesclavel });
      });
      gs.sort((a, b) => a.email.localeCompare(b.email));
      setGrupos(gs);
    } catch (e: any) {
      toast.error(`Erro ao buscar duplicatas: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResumo(null);
      carregar();
    }
  }, [isOpen]);

  const mesclarGrupo = async (g: Grupo) => {
    const principal = escolherPrincipal(g.registros);
    if (!principal) return { marcados: 0, transferidas: 0 };
    const antigos = g.registros.filter((r) => !r.referral_id);
    let marcados = 0;
    let transferidas = 0;

    const { data: destino, error: dErr } = await supabase
      .from("indicacoes")
      .select("vaga, empresa, data_acao")
      .eq("candidato_id", principal.id);
    if (dErr) throw dErr;
    const chave = (i: any) => `${i.vaga}|${i.empresa}|${i.data_acao}`;
    const existentes = new Set((destino ?? []).map(chave));

    for (const antigo of antigos) {
      const { data: inds, error } = await supabase
        .from("indicacoes")
        .select("id, vaga, empresa, data_acao")
        .eq("candidato_id", antigo.id);
      if (error) throw error;
      // Indicações idênticas já existentes no principal ficam no registro antigo (evita duplicar)
      const mover = (inds ?? []).filter((i) => !existentes.has(chave(i)));
      mover.forEach((i) => existentes.add(chave(i)));
      for (let k = 0; k < mover.length; k += 100) {
        const ids = mover.slice(k, k + 100).map((i) => i.id);
        const { error: uErr } = await supabase
          .from("indicacoes")
          .update({ candidato_id: principal.id })
          .in("id", ids);
        if (uErr) throw uErr;
      }
      transferidas += mover.length;
      const { error: sErr } = await supabase
        .from("candidatos")
        .update({ status: "duplicado" })
        .eq("id", antigo.id);
      if (sErr) throw sErr;
      marcados += 1;
    }
    return { marcados, transferidas };
  };

  const executar = async (lista: Grupo[]) => {
    setMerging(true);
    let m = 0;
    let t = 0;
    try {
      for (const g of lista.filter((x) => x.mesclavel)) {
        const r = await mesclarGrupo(g);
        m += r.marcados;
        t += r.transferidas;
      }
      const texto = `${m} duplicatas marcadas, ${t} indicações transferidas`;
      setResumo(texto);
      toast.success(texto);
      onSuccess();
      await carregar();
    } catch (e: any) {
      toast.error(`Erro ao mesclar: ${e.message}`);
    } finally {
      setMerging(false);
    }
  };

  const mesclaveis = grupos.filter((g) => g.mesclavel).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Limpar Duplicatas Antigas</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 text-sm text-[#666666]">
          <p>
            {loading
              ? "Buscando..."
              : `${grupos.length} e-mails com mais de um cadastro (${mesclaveis} mescláveis).`}
          </p>
          <Button
            disabled={loading || merging || mesclaveis === 0}
            onClick={() => executar(grupos)}
          >
            {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mesclar Todos
          </Button>
        </div>

        {resumo && (
          <p className="rounded-md bg-[#F0EBF5] px-4 py-2 text-sm font-medium text-primary">{resumo}</p>
        )}

        <div className="flex-1 overflow-auto space-y-4 py-2">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </div>
          ) : grupos.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#666666]">Nenhuma duplicata encontrada.</p>
          ) : (
            grupos.map((g) => (
              <div key={g.email} className="rounded-lg border border-border">
                <div className="flex items-center justify-between bg-[#F5F5F5] px-4 py-2">
                  <span className="text-sm font-semibold text-[#333333]">{g.email}</span>
                  {g.mesclavel ? (
                    <Button size="sm" variant="outline" disabled={merging} onClick={() => executar([g])}>
                      Mesclar
                    </Button>
                  ) : (
                    <span className="text-xs text-[#666666]">
                      {g.registros.some((r) => r.referral_id)
                        ? "Todos têm Referral — revisar manualmente"
                        : "Nenhum com Referral — revisar manualmente"}
                    </span>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referral</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Indicações</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.registros.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.referral_id || "sem referral"}</TableCell>
                        <TableCell>{r.nome}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.indicacoes}</TableCell>
                        <TableCell>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
