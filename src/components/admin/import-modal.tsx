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
  const [debugInfo, setDebugInfo] = useState<{ sheetName: string; headerRow: number; columnsFound: string[] } | null>(null);
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
      
      // Find best sheet
      let targetSheetName = workbook.SheetNames.find(name => name.includes("2026")) || workbook.SheetNames[0];
      let foundHeaderRow = -1;
      let finalJsonData: any[][] = [];
      const keywords = ["Assessorado", "Email", "Parceiro", "Área", "Jobhunter", "Nível de Cargo", "Último Salário", "Telefone"];

      // If "2026" didn't work immediately, or to double check header existence
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        // Scan first 5 lines
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
          const row = jsonData[i].map(cell => String(cell || "").trim().toLowerCase());
          const matchCount = keywords.filter(k => 
            row.some(cell => cell.includes(k.toLowerCase()))
          ).length;

          if (matchCount >= 3) {
            targetSheetName = sheetName;
            foundHeaderRow = i;
            finalJsonData = jsonData;
            break;
          }
        }
        if (foundHeaderRow !== -1) break;
      }

      if (foundHeaderRow === -1) {
        // Fallback to first sheet row 0 if nothing found
        const ws = workbook.Sheets[targetSheetName];
        finalJsonData = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][] : [];
        foundHeaderRow = 0;
      }

      const headers = finalJsonData[foundHeaderRow].map(h => String(h || "").trim());
      const dataRows = finalJsonData.slice(foundHeaderRow + 1);

      // Mapping logic
      const getColumnIndex = (patterns: string[], excludeIndex: number = -1) => {
        return headers.findIndex((h, idx) => {
          if (idx === excludeIndex) return false;
          const lowerH = h.toLowerCase();
          return patterns.some(p => lowerH.includes(p.toLowerCase()));
        });
      };

      const idxNome = getColumnIndex(["assessorado"]);
      const idxEmail = getColumnIndex(["email", "e-mail"]);
      const idxParceiro = getColumnIndex(["parceiro"]);
      // For "Área", we want to be careful about the "resíduo" in row 0
      const idxArea = getColumnIndex(["área", "area"]);
      const idxNivel = getColumnIndex(["nível", "nivel"]);
      const idxSalario = headers.findIndex(h => {
        const lh = h.toLowerCase();
        return (lh.includes("salário") || lh.includes("salario")) && (lh.includes("último") || lh.includes("ultimo"));
      });
      const idxTelefone = getColumnIndex(["telefone"]);
      const idxJobhunter = getColumnIndex(["jobhunter"]);

      setDebugInfo({
        sheetName: targetSheetName,
        headerRow: foundHeaderRow + 1,
        columnsFound: headers.filter((_, i) => 
          [idxNome, idxEmail, idxParceiro, idxArea, idxNivel, idxSalario, idxTelefone, idxJobhunter].includes(i)
        )
      });

      const mappedData = dataRows
        .filter(row => {
          const valNome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
          if (!valNome) return false;

          if (idxParceiro !== -1) {
            const parceiro = String(row[idxParceiro] || "").trim().toUpperCase();
            return parceiro === "LHH" || parceiro === "";
          }
          return true;
        })
        .map(row => {
          const rawNome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
          return {
            nome: rawNome.replace(/\([^)]*\)/g, "").trim(),
            nome_normalizado: normalizeName(rawNome),
            email: idxEmail !== -1 && row[idxEmail] ? String(row[idxEmail]).trim() : null,
            parceiro: idxParceiro !== -1 ? (row[idxParceiro] || "LHH") : "LHH",
            area: idxArea !== -1 ? row[idxArea] : null,
            nivel_cargo: idxNivel !== -1 ? row[idxNivel] : null,
            ultimo_salario: idxSalario !== -1 ? row[idxSalario] : null,
            telefone: idxTelefone !== -1 ? row[idxTelefone] : null,
            consultor_responsavel: idxJobhunter !== -1 ? row[idxJobhunter] : null,
            status: "ativo",
          };
        });

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
