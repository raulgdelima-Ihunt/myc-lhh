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
  const [debugInfo, setDebugInfo] = useState<{ 
    sheetName: string; 
    headerRow: number; 
    columnsFound: string[];
    hasPartnerFilter: boolean;
    totalBeforeFilter: number;
    totalAfterFilter: number;
  } | null>(null);
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
      
      // Find best sheet based on priority
      const getSheetPriority = (name: string) => {
        if (name === "2026") return 1000;
        const numMatch = name.match(/\d+/);
        if (numMatch) return parseInt(numMatch[0]);
        return 0;
      };

      const sortedSheetNames = [...workbook.SheetNames].sort((a, b) => {
        const prioA = getSheetPriority(a);
        const prioB = getSheetPriority(b);
        if (prioA !== prioB) return prioB - prioA;
        return 0; // If equal, preserve original order (or the sort might change it)
      });
      
      // The instructions say: 1. "2026" (exact), 2. highest number, 3. last sheet.
      // We will try them in that order of preference for header detection.
      const priorityOrder: string[] = [];
      const exact2026 = workbook.SheetNames.find(n => n === "2026");
      if (exact2026) priorityOrder.push(exact2026);
      
      const sheetsWithNumbers = workbook.SheetNames
        .filter(n => n !== "2026" && /\d+/.test(n))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)![0]);
          const numB = parseInt(b.match(/\d+/)![0]);
          return numB - numA;
        });
      priorityOrder.push(...sheetsWithNumbers);
      
      const lastSheet = workbook.SheetNames[workbook.SheetNames.length - 1];
      if (lastSheet && !priorityOrder.includes(lastSheet)) priorityOrder.push(lastSheet);

      // Also add remaining sheets just in case
      workbook.SheetNames.forEach(n => {
        if (n && !priorityOrder.includes(n)) priorityOrder.push(n);
      });

      let targetSheetName = "";
      let foundHeaderRow = -1;
      let finalJsonData: any[][] = [];
      const keywords = ["Assessorado", "Email", "Parceiro", "Área", "Jobhunter", "Nível de Cargo", "Último Salário", "Telefone", "REFERRAL", "NOME"];

      for (const sheetName of priorityOrder) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
          const rowData = jsonData[i];
          if (!rowData) continue;
          const row = rowData.map(cell => String(cell || "").trim().toLowerCase());

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
        const ws = targetSheetName ? workbook.Sheets[targetSheetName] : workbook.Sheets[workbook.SheetNames[0]];
        finalJsonData = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][] : [];
        foundHeaderRow = 0;
      }

      const headerRowData = finalJsonData[foundHeaderRow];
      if (!headerRowData) {
        toast.error("Cabeçalho não encontrado.");
        return;
      }
      const headers = headerRowData.map(h => String(h || "").trim());
      const dataRows = finalJsonData.slice(foundHeaderRow + 1);

      // Mapping logic
      const getColumnIndex = (patterns: string[]) => {
        return headers.findIndex((h) => {
          const lowerH = h.toLowerCase();
          return patterns.some(p => lowerH.includes(p.toLowerCase()));
        });
      };

      // Detect Format
      const isNewFormat = getColumnIndex(["REFERRAL"]) !== -1 && getColumnIndex(["NOME"]) !== -1;

      // Base mappings
      const idxNome = isNewFormat ? getColumnIndex(["NOME"]) : getColumnIndex(["assessorado"]);
      const idxEmail = getColumnIndex(["email", "e-mail"]);
      const idxTelefone = getColumnIndex(["telefone"]);
      const idxConsultor = getColumnIndex(["consultor", "jobhunter"]);
      const idxParceiro = getColumnIndex(["parceiro"]);

      // New columns mapping
      const idxReferral = getColumnIndex(["REFERRAL"]);
      const idxDistribuicao = getColumnIndex(["DISTRIBUIÇÃO"]);
      const idxLinkedin = getColumnIndex(["LINKEDIN"]);
      const idxInicio = getColumnIndex(["INÍCIO"]);
      const idxTermino = getColumnIndex(["TÉRMINO"]);
      const idxStatusProg = getColumnIndex(["STATUS PROGRAMA"]);
      const idxUltimaPos = getColumnIndex(["ÚLTIMA POSIÇÃO"]);
      const idxPosicoesAlvo = getColumnIndex(["POSIÇÕES ALVO", "CARGOS DE INTERESSE"]);
      const idxUltimoSeg = getColumnIndex(["ÚLTIMO SEGMENTO"]);
      const idxUltimaEmp = getColumnIndex(["ÚLTIMA EMPRESA"]);
      const idxSegmentoAlvo = getColumnIndex(["SEGMENTO ALVO"]);
      const idxPretensao = getColumnIndex(["REMUNERAÇÃO", "PRETENSÃO"]);
      const idxUltimoSalario = getColumnIndex(["ÚLTIMA REMUNERAÇÃO", "Último Salário"]);
      const idxMobilidade = getColumnIndex(["MOBILIDADE"]);
      const idxLocal = getColumnIndex(["LOCAL"]);
      const idxEmpresasAlvo = getColumnIndex(["EMPRESAS ALVO"]);
      const idxObservacao = getColumnIndex(["PERFIL CANDIDATO", "OBSERVAÇÃO"]);
      const idxIdade = getColumnIndex(["IDADE"]);
      const idxArea = getColumnIndex(["ÁREA"]);
      const idxNivel = getColumnIndex(["NÍVEL DE CARGO"]);

      const parseDate = (val: any) => {
        if (!val) return null;
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      };

      const filteredRows = dataRows.filter(row => {
        const valNome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
        if (!valNome) return false;

        if (idxParceiro !== -1) {
          const parceiro = String(row[idxParceiro] || "").trim().toUpperCase();
          return parceiro === "LHH";
        }
        return true;
      });

      setDebugInfo({
        sheetName: targetSheetName || "Nenhuma",
        headerRow: foundHeaderRow + 1,
        columnsFound: headers.filter((h, i) => h && i !== -1),
        hasPartnerFilter: idxParceiro !== -1,
        totalBeforeFilter: dataRows.length,
        totalAfterFilter: filteredRows.length
      });

      const mappedData = filteredRows.map(row => {
        const rawNome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
        return {
          referral_id: idxReferral !== -1 ? String(row[idxReferral] || "").trim() : null,
          nome: rawNome.replace(/\([^)]*\)/g, "").trim(),
          nome_normalizado: normalizeName(rawNome),
          email: idxEmail !== -1 && row[idxEmail] ? String(row[idxEmail]).trim() : null,
          telefone: idxTelefone !== -1 ? String(row[idxTelefone] || "").trim() : null,
          consultor_responsavel: idxConsultor !== -1 ? String(row[idxConsultor] || "").trim() : null,
          distribuicao: idxDistribuicao !== -1 ? String(row[idxDistribuicao] || "").trim() : null,
          linkedin: idxLinkedin !== -1 ? String(row[idxLinkedin] || "").trim() : null,
          inicio_programa: idxInicio !== -1 ? parseDate(row[idxInicio]) : null,
          termino_programa: idxTermino !== -1 ? parseDate(row[idxTermino]) : null,
          status_programa: idxStatusProg !== -1 ? String(row[idxStatusProg] || "").trim() : null,
          ultima_posicao: idxUltimaPos !== -1 ? String(row[idxUltimaPos] || "").trim() : null,
          posicoes_alvo: idxPosicoesAlvo !== -1 ? String(row[idxPosicoesAlvo] || "").trim() : null,
          ultimo_segmento: idxUltimoSeg !== -1 ? String(row[idxUltimoSeg] || "").trim() : null,
          ultima_empresa: idxUltimaEmp !== -1 ? String(row[idxUltimaEmp] || "").trim() : null,
          segmento_alvo: idxSegmentoAlvo !== -1 ? String(row[idxSegmentoAlvo] || "").trim() : null,
          pretensao_salarial: idxPretensao !== -1 ? String(row[idxPretensao] || "").trim() : null,
          ultimo_salario: idxUltimoSalario !== -1 ? String(row[idxUltimoSalario] || "").trim() : null,
          mobilidade: idxMobilidade !== -1 ? String(row[idxMobilidade] || "").trim() : null,
          local_residencia: idxLocal !== -1 ? String(row[idxLocal] || "").trim() : null,
          empresas_alvo: idxEmpresasAlvo !== -1 ? String(row[idxEmpresasAlvo] || "").trim() : null,
          observacao: idxObservacao !== -1 ? String(row[idxObservacao] || "").trim() : null,
          idade: idxIdade !== -1 ? String(row[idxIdade] || "").trim() : null,
          area: idxArea !== -1 ? String(row[idxArea] || "").trim() : null,
          nivel_cargo: idxNivel !== -1 ? String(row[idxNivel] || "").trim() : null,
          parceiro: idxParceiro !== -1 ? String(row[idxParceiro] || "").trim() : "LHH",
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
          let existing = null;

          if (candidate.referral_id) {
            const { data } = await supabase
              .from("candidatos")
              .select("id")
              .eq("referral_id", candidate.referral_id)
              .maybeSingle();
            existing = data;
          }

          if (!existing) {
            const { data } = await supabase
              .from("candidatos")
              .select("id")
              .eq("nome_normalizado", candidate.nome_normalizado)
              .maybeSingle();
            existing = data;
          }

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
              {debugInfo && (
                <div className="bg-gray-100 p-3 rounded text-[11px] font-mono text-gray-700">
                  Aba selecionada: {debugInfo.sheetName} | Linha do cabeçalho: {debugInfo.headerRow} | Colunas encontradas: {debugInfo.columnsFound.join(", ")} | Filtro Parceiro: {debugInfo.hasPartnerFilter ? "Sim" : "Não"} | Total antes do filtro: {debugInfo.totalBeforeFilter} | Após filtro LHH: {debugInfo.totalAfterFilter}
                </div>
              )}
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
