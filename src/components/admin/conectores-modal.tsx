import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Conector {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ConectoresModal({ isOpen, onClose }: Props) {
  const [conectores, setConectores] = useState<Conector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Conector | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const loadConectores = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("conectores")
      .select("id, nome, email, ativo")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar conectores: " + error.message);
    } else {
      setConectores(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadConectores();
      setShowForm(false);
      setEditing(null);
      setNome("");
      setEmail("");
    }
  }, [isOpen]);

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setNome("");
    setEmail("");
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Informe o nome e o e-mail do conector.");
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("conectores")
          .update({
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Conector atualizado!");
      } else {
        const { error } = await supabase
          .from("conectores")
          .insert({ nome: nome.trim(), email: email.trim().toLowerCase() });
        if (error) throw error;
        toast.success("Conector adicionado!");
      }
      resetForm();
      await loadConectores();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAtivo = async (c: Conector) => {
    const { error } = await supabase
      .from("conectores")
      .update({ ativo: !c.ativo, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
    } else {
      toast.success(c.ativo ? "Conector desativado." : "Conector reativado.");
      await loadConectores();
    }
  };

  const startEdit = (c: Conector) => {
    setEditing(c);
    setNome(c.nome);
    setEmail(c.email);
    setShowForm(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conectores</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="conector-nome">Nome</Label>
              <Input
                id="conector-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do conector"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conector-email">E-mail</Label>
              <Input
                id="conector-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="conector@email.com"
              />
            </div>
          </div>
        ) : (
          <div className="py-2">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              </div>
            ) : conectores.length > 0 ? (
              <Table>
                <TableHeader className="bg-[#F5F5F5]">
                  <TableRow>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-[100px] font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conectores.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-[#333333]">{c.nome}</TableCell>
                      <TableCell className="text-[#666666]">{c.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            c.ativo
                              ? "bg-green-50 text-green-700 ring-green-200"
                              : "bg-gray-100 text-gray-500 ring-gray-200"
                          }`}
                        >
                          {c.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(c)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAtivo(c)}
                            title={c.ativo ? "Desativar" : "Reativar"}
                          >
                            <Power
                              className={`h-4 w-4 ${c.ativo ? "text-red-500" : "text-green-600"}`}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-8 text-center text-sm text-[#666666]">
                Nenhum conector cadastrado.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {showForm ? (
            <>
              <Button variant="outline" onClick={resetForm}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Salvar alterações" : "Adicionar conector"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Conector
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
