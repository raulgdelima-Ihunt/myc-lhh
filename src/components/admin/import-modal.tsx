import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCandidatosModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withoutEmail: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const normalizeName = (name: string) => {
    if (!name) return "";
    return name
      .replace(/\([^)]*\)/g, "") // Remove contents in parentheses
      .trim()
      .toLowerCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Find sheet with "Assessorado"
      let targetSheetName = workbook.SheetNames[0];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Check row 0 or 1 for "Assessorado"
        const headerRow1 = jsonData[0] || [];
        const headerRow2 = jsonData[1] || [];
        
        if (headerRow1.includes("Assessorado") || headerRow2.includes("Assessorado")) {
          targetSheetName = sheetName;
          break;
        }
      }

      const worksheet = workbook.Sheets[targetSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const mappedData = rawData
        .filter((row: any) => {
          const parceiro = String(row["Parceiro"] || "").toUpperCase();
          return parceiro === "LHH" || !row["Parceiro"];
        })
        .map((row: any) => ({
          nome: String(row["Assessorado"] || ""),
          nome_normalizado: normalizeName(String(row["Assessorado"] || "")),
          email: row["Email"] ? String(row["Email"]).trim() : null,
          parceiro: row["Parceiro"] || "LHH",
          area: row["Área"] || null,
          nivel_cargo: row["Nível de Cargo"] || null,
          ultimo_salario: row["Último Salário"] || null,
          telefone: row["Telefone"] || null,
          consultor_responsavel: row["Jobhunter"] || null,
          status: "ativo",
        }));

      setPreviewData(mappedData);
      
      const withEmail = mappedData.filter(c => c.email).length;
      setStats({
        total: mappedData.length,
        withEmail,
        withoutEmail: mappedData.length - withEmail
      });

    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erro ao processar o arquivo Excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData.length) return;
    setIsUploading(true);

    try {
      let insertedCount = 0;
      let updatedCount = 0;

      // Process in chunks to avoid timeout
      const chunkSize = 50;
      for (let i = 0; i < previewData.length; i += chunkSize) {
        const chunk = previewData.slice(i, i + chunkSize);
        
        for (const candidate of chunk) {
          const { data: existing } = await supabase
            .from("candidatos")
            .select("id")
            .eq("nome_normalizado", candidate.nome_normalizado)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase
              .from("candidatos")
              .update(candidate)
              .eq("id", existing.id);
            if (updateError) throw updateError;
            updatedCount++;
          } else {
            const { error: insertError } = await supabase
              .from("candidatos")
              .insert(candidate);
            if (insertError) throw insertError;
            insertedCount++;
          }
        }
      }

      toast.success(`${insertedCount} inseridos, ${updatedCount} atualizados.`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Erro ao importar candidatos.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Candidatos (Excel)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-violet-400 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">Selecione um arquivo .xlsx para começar</p>
              <Input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="max-w-xs cursor-pointer"
              />
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-4" />
              <p>Processando planilha...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-violet-50 p-4 rounded-lg">
                  <p className="text-xs text-violet-600 font-medium uppercase">A importar</p>
                  <p className="text-2xl font-bold text-violet-900">{stats.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-green-600 font-medium uppercase">Com E-mail</p>
                  <p className="text-2xl font-bold text-green-900">{stats.withEmail}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium uppercase">Sem E-mail</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.withoutEmail}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Prévia (10 primeiras linhas)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Consultor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.nome}</TableCell>
                          <TableCell>{row.email || "-"}</TableCell>
                          <TableCell>{row.area || "-"}</TableCell>
                          <TableCell>{row.consultor_responsavel || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          {file && !isProcessing && (
            <Button 
              onClick={handleConfirmImport} 
              disabled={isUploading}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                "Confirmar Importação"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
