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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [stats, setStats] = useState({
    total: 0,
    withEmail: 0,
    withoutEmail: 0,
    novos: 0,
    atualizados: 0,
    semAlteracao: 0,
  });

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
      let targetSheetName = "";
      let foundHeaderRow = -1;
      let finalJsonData: any[][] = [];
      const keywords = ["Assessorado", "Email", "Parceiro", "REFERRAL", "NOME", "E-MAIL"];

      const sheetsInfo: { name: string, rows: number }[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        sheetsInfo.push({ name: sheetName, rows: jsonData.length });
        
        // Scan first 5 lines for header
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
          const rowData = jsonData[i];
          if (!rowData) continue;
          const row = rowData.map(cell => String(cell || "").trim().toUpperCase());

          const hasReferral = row.some(cell => cell.includes("REFERRAL"));
          const hasNome = row.some(cell => cell.includes("NOME"));
          const hasEmail = row.some(cell => cell.includes("E-MAIL") || cell.includes("EMAIL"));

          if (hasReferral && hasNome && hasEmail) {
            // Found a candidate sheet. If we already found one, prefer the one with more rows.
            if (foundHeaderRow === -1 || jsonData.length > finalJsonData.length) {
              targetSheetName = sheetName;
              foundHeaderRow = i;
              finalJsonData = jsonData;
            }
            break; 
          }

          // Compatibility: check for old format if new not found yet
          if (foundHeaderRow === -1) {
            const hasAssessorado = row.some(cell => cell.includes("ASSESSORADO"));
            if (hasAssessorado) {
              targetSheetName = sheetName;
              foundHeaderRow = i;
              finalJsonData = jsonData;
            }
          }
        }
      }

      console.log(`Abas encontradas: ${sheetsInfo.map(s => `${s.name} (${s.rows} linhas)`).join(", ")} | Aba selecionada: ${targetSheetName}`);

      if (foundHeaderRow === -1) {
        const firstSheetName = workbook.SheetNames[0];
        if (firstSheetName) {
          const ws = workbook.Sheets[firstSheetName];
          finalJsonData = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][] : [];
          foundHeaderRow = 0;
          targetSheetName = firstSheetName;
        }
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
      const idxLinkRelatorio = getColumnIndex(["LINK RELATÓRIO"]);
      const idxCVCandidato = getColumnIndex(["CV CANDIDATO"]);
      const idxReuniao = getColumnIndex(["REUNIÃO REALIZADA"]);


      const parseDate = (val: any) => {
        if (!val) return null;
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      };

      const filterPlaceholder = (val: any) => {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        const placeholders = [
          "não identificad",
          "não cadastrado",
          "não encontrad",
          "Nenhum cargo",
          "Nenhuma empresa"
        ];
        if (placeholders.some(p => str.toLowerCase().includes(p.toLowerCase()))) {
          return null;
        }
        return str || null;
      };

      const mappedData: any[] = [];
      let lastCandidate: any = null;

      dataRows.forEach((row, rowIndex) => {
        const valReferral = idxReferral !== -1 ? filterPlaceholder(row[idxReferral]) : null;
        const rawNome = idxNome !== -1 ? String(row[idxNome] || "").trim() : "";
        const valNome = filterPlaceholder(rawNome);

        // Multi-row detection: if referral and nome are empty but we have data in specific columns
        const isExtraRow = !valReferral && !valNome && lastCandidate;

        if (isExtraRow) {
          const extraPosicoes = idxPosicoesAlvo !== -1 ? filterPlaceholder(row[idxPosicoesAlvo]) : null;
          const extraEmpresas = idxEmpresasAlvo !== -1 ? filterPlaceholder(row[idxEmpresasAlvo]) : null;
          
          if (extraPosicoes) {
            lastCandidate.posicoes_alvo = lastCandidate.posicoes_alvo 
              ? `${lastCandidate.posicoes_alvo};${extraPosicoes}` 
              : extraPosicoes;
          }
          if (extraEmpresas) {
            lastCandidate.empresas_alvo = lastCandidate.empresas_alvo 
              ? `${lastCandidate.empresas_alvo};${extraEmpresas}` 
              : extraEmpresas;
          }
          return;
        }

        if (!valNome && !valReferral) return; // Skip truly empty lines

        // Filter by Partner LHH if applicable
        if (idxParceiro !== -1) {
          const parceiro = String(row[idxParceiro] || "").trim().toUpperCase();
          if (parceiro !== "LHH") return;
        }

        const candidate = {
          referral_id: valReferral,
          nome: rawNome.replace(/\([^)]*\)/g, "").trim(),
          nome_normalizado: normalizeName(rawNome),
          email: idxEmail !== -1 ? filterPlaceholder(row[idxEmail]) : null,
          telefone: idxTelefone !== -1 ? filterPlaceholder(row[idxTelefone]) : null,
          consultor_responsavel: idxConsultor !== -1 ? filterPlaceholder(row[idxConsultor]) : null,
          distribuicao: idxDistribuicao !== -1 ? filterPlaceholder(row[idxDistribuicao]) : null,
          linkedin: idxLinkedin !== -1 ? filterPlaceholder(row[idxLinkedin]) : null,
          inicio_programa: idxInicio !== -1 ? parseDate(row[idxInicio]) : null,
          termino_programa: idxTermino !== -1 ? parseDate(row[idxTermino]) : null,
          status_programa: idxStatusProg !== -1 ? filterPlaceholder(row[idxStatusProg]) : null,
          ultima_posicao: idxUltimaPos !== -1 ? filterPlaceholder(row[idxUltimaPos]) : null,
          posicoes_alvo: idxPosicoesAlvo !== -1 ? filterPlaceholder(row[idxPosicoesAlvo]) : null,
          ultimo_segmento: idxUltimoSeg !== -1 ? filterPlaceholder(row[idxUltimoSeg]) : null,
          ultima_empresa: idxUltimaEmp !== -1 ? filterPlaceholder(row[idxUltimaEmp]) : null,
          segmento_alvo: idxSegmentoAlvo !== -1 ? filterPlaceholder(row[idxSegmentoAlvo]) : null,
          pretensao_salarial: idxPretensao !== -1 ? filterPlaceholder(row[idxPretensao]) : null,
          ultimo_salario: idxUltimoSalario !== -1 ? filterPlaceholder(row[idxUltimoSalario]) : null,
          mobilidade: idxMobilidade !== -1 ? filterPlaceholder(row[idxMobilidade]) : null,
          local_residencia: idxLocal !== -1 ? filterPlaceholder(row[idxLocal]) : null,
          empresas_alvo: idxEmpresasAlvo !== -1 ? filterPlaceholder(row[idxEmpresasAlvo]) : null,
          observacao: idxObservacao !== -1 ? filterPlaceholder(row[idxObservacao]) : null,
          idade: idxIdade !== -1 ? filterPlaceholder(row[idxIdade]) : null,
          area: idxArea !== -1 ? filterPlaceholder(row[idxArea]) : null,
          nivel_cargo: idxNivel !== -1 ? filterPlaceholder(row[idxNivel]) : null,
          link_relatorio: idxLinkRelatorio !== -1 ? filterPlaceholder(row[idxLinkRelatorio]) : null,
          cv_candidato: idxCVCandidato !== -1 ? filterPlaceholder(row[idxCVCandidato]) : null,
          reuniao_status: idxReuniao !== -1 ? filterPlaceholder(row[idxReuniao]) : null,
          parceiro: idxParceiro !== -1 ? String(row[idxParceiro] || "").trim() : "LHH",
          status: "ativo",
        };

        mappedData.push(candidate);
        lastCandidate = candidate;
      });

      setDebugInfo({
        sheetName: targetSheetName || "Nenhuma",
        headerRow: foundHeaderRow + 1,
        columnsFound: headers.filter((h, i) => h && i !== -1),
        hasPartnerFilter: idxParceiro !== -1,
        totalBeforeFilter: dataRows.length,
        totalAfterFilter: mappedData.length
      });


      setPreviewData(mappedData);

      const withEmail = mappedData.filter(c => c.email).length;

      // Compare against the existing base: never delete, only insert/update
      const { data: existentes } = await supabase.from("candidatos").select("*");
      const byReferral = new Map<string, any>();
      const byNome = new Map<string, any>();
      (existentes ?? []).forEach((row: any) => {
        if (row.referral_id) byReferral.set(String(row.referral_id), row);
        if (row.nome_normalizado) byNome.set(String(row.nome_normalizado), row);
      });

      let novos = 0;
      let atualizados = 0;
      let semAlteracao = 0;

      mappedData.forEach((c) => {
        const existing =
          (c.referral_id && byReferral.get(String(c.referral_id))) ||
          byNome.get(c.nome_normalizado);

        if (!existing) {
          novos += 1;
          return;
        }

        const changed = Object.keys(c).some((key) => {
          if (key === "status") return false;
          const next = (c as any)[key];
          if (next === null || next === undefined || next === "") return false;
          return String(next) !== String(existing[key] ?? "");
        });

        if (changed) atualizados += 1;
        else semAlteracao += 1;
      });

      setStats({
        total: mappedData.length,
        withEmail,
        withoutEmail: mappedData.length - withEmail,
        novos,
        atualizados,
        semAlteracao,
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
      // Never delete: keep existing candidates and their current status
      const { data: existentes } = await supabase
        .from("candidatos")
        .select("referral_id, nome_normalizado");

      const existingReferrals = new Set(
        (existentes ?? []).map((r: any) => String(r.referral_id ?? "")).filter(Boolean),
      );
      const existingNomes = new Set(
        (existentes ?? []).map((r: any) => String(r.nome_normalizado ?? "")).filter(Boolean),
      );

      const rowsToUpsert = previewData.map((c) => {
        const alreadyExists =
          (c.referral_id && existingReferrals.has(String(c.referral_id))) ||
          existingNomes.has(c.nome_normalizado);

        if (!alreadyExists) return c;
        const { status, ...rest } = c;
        return rest;
      });


      // Process in chunks to avoid timeout
      const chunkSize = 50;
      for (let i = 0; i < previewData.length; i += chunkSize) {
        const chunk = previewData.slice(i, i + chunkSize);
        
        // Separate those with referral_id and those without
        const withReferral = chunk.filter(c => c.referral_id);
        const withoutReferral = chunk.filter(c => !c.referral_id && c.nome_normalizado);

        if (withReferral.length > 0) {
          const { error } = await supabase
            .from("candidatos")
            .upsert(withReferral as any, { 
              onConflict: 'referral_id',
              ignoreDuplicates: false 
            });
          if (error) throw error;
        }

        if (withoutReferral.length > 0) {
          const { error } = await supabase
            .from("candidatos")
            .upsert(withoutReferral as any, { 
              onConflict: 'nome_normalizado',
              ignoreDuplicates: false 
            });
          if (error) throw error;
        }
      }

      toast.success(`Importação concluída: ${previewData.length} candidatos processados.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error(`Erro ao importar: ${error.message || "Verifique o console para detalhes"}`);
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

              <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Checkbox 
                  id="clear-db" 
                  checked={clearDatabase} 
                  onCheckedChange={(checked) => setClearDatabase(checked === true)}
                />
                <Label 
                  htmlFor="clear-db" 
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Limpar base de candidatos antes de importar (Recomendado)
                </Label>
              </div>

              <div>

                <h3 className="text-sm font-semibold mb-2">Prévia (10 primeiras linhas)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referral</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Status Prog.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-[10px]">{row.referral_id || "-"}</TableCell>
                          <TableCell className="font-medium">{row.nome}</TableCell>
                          <TableCell>{row.email || "-"}</TableCell>
                          <TableCell>{row.area || "-"}</TableCell>
                          <TableCell>{row.status_programa || "-"}</TableCell>
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
