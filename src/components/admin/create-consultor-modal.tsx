import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { createConsultorAccess } from "@/lib/auth.functions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  consultores: string[];
}

export function CreateConsultorModal({ isOpen, onClose, consultores }: Props) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleClose = () => {
    setEmail("");
    setNome("");
    setTempPassword(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !nome.trim()) {
      toast.error("Informe o e-mail e o nome do consultor.");
      return;
    }

    setIsSaving(true);
    const pass = Math.random().toString(36).slice(-8);

    try {
      await createConsultorAccess({
        data: { email: email.trim(), password: pass, nome: nome.trim() },
      });
      setTempPassword(pass);
      toast.success("Acesso de consultor criado!");
    } catch (error: any) {
      toast.error("Erro ao criar acesso: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar acesso de consultor</DialogTitle>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <CheckCircle size={16} className="text-[#4CAF50]" />
              Acesso criado!
            </h3>
            <p className="text-xs leading-relaxed text-amber-800">
              Envie estas credenciais ao consultor:
            </p>
            <div className="space-y-2 rounded-lg border border-amber-100 bg-white/60 p-3">
              <p className="text-xs font-medium text-[#666666]">
                E-mail: <span className="select-all font-bold text-[#333333]">{email}</span>
              </p>
              <p className="text-xs font-medium text-[#666666]">
                Senha temporária: <span className="select-all font-bold text-primary">{tempPassword}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="consultor-email">E-mail do consultor</Label>
              <Input
                id="consultor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="consultor@lhh.com.br"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="consultor-nome">
                Nome (igual à coluna &quot;Consultor&quot; da planilha)
              </Label>
              <Input
                id="consultor-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do consultor"
                list="consultores-existentes"
              />
              <datalist id="consultores-existentes">
                {consultores.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-xs text-[#666666]">
                O consultor verá apenas os candidatos com este nome na coluna Consultor.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tempPassword ? "Fechar" : "Cancelar"}
          </Button>
          {!tempPassword && (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar acesso
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
