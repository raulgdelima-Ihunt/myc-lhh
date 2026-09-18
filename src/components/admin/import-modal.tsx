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

      // Exact header match (used when similar headers exist, e.g. "Status" vs "Status DTE")
      const getExactColumnIndex = (patterns: string[]) => {
        return headers.findIndex((h) => {
          const lowerH = h.trim().toLowerCase();
          return patterns.some(p => lowerH === p.trim().toLowerCase());
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
      const idxStatusProg =
        getColumnIndex(["STATUS PROGRAMA", "STATUS PROG"]) !== -1
          ? getColumnIndex(["STATUS PROGRAMA", "STATUS PROG"])
          : getExactColumnIndex(["STATUS"]);
      const idxPrograma = getExactColumnIndex(["PROGRAMA"]);
      const idxStatusDte = getColumnIndex(["STATUS DTE"]);
      const idxStatusOrbit = getColumnIndex(["STATUS ORBIT"]);
      const idxDataCvDte = getColumnIndex(["DATA DE CV DTE", "DATA CV DTE"]);
      const idxSituacaoDte = getExactColumnIndex(["SITUAÇÃO DTE", "SITUACAO DTE"]);
      const idxComplementoSituacaoDte = getColumnIndex(["COMPLEMENTO SITUAÇÃO DTE", "COMPLEMENTO SITUACAO DTE"]);
      const idxTalent = getExactColumnIndex(["TALENT"]);
      const idxForms = getColumnIndex(["FORMS PREENCHIDO"]);
      const idxIdioma = getExactColumnIndex(["IDIOMA"]);
      const idxNomeCompleto = getColumnIndex(["NOME COMPLETO"]);
      const idxEmailContato = getColumnIndex(["E-MAIL PARA CONTATO", "EMAIL PARA CONTATO"]);
      const idxEmpresasRestritas = getColumnIndex(["EMPRESAS RESTRITAS"]);
      const idxFaixaSalarial = getColumnIndex(["FAIXA SALARIAL"]);
      const idxCarta = getColumnIndex(["CARTA DE APRESENTAÇÃO", "CARTA DE APRESENTACAO"]);
      const idxLgpd = getColumnIndex(["LGPD"]);
      const idxPcd = getExactColumnIndex(["PCD", "PCD?"]);
      const idxDescricaoPcd = getColumnIndex(["DESCRIÇÃO PCD", "DESCRICAO PCD"]);
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
          programa: idxPrograma !== -1 ? filterPlaceholder(row[idxPrograma]) : null,
          status_dte: idxStatusDte !== -1 ? filterPlaceholder(row[idxStatusDte]) : null,
          status_orbit: idxStatusOrbit !== -1 ? filterPlaceholder(row[idxStatusOrbit]) : null,
          data_cv_dte: idxDataCvDte !== -1 ? parseDate(row[idxDataCvDte]) : null,
          situacao_dte: idxSituacaoDte !== -1 ? filterPlaceholder(row[idxSituacaoDte]) : null,
          complemento_situacao_dte: idxComplementoSituacaoDte !== -1 ? filterPlaceholder(row[idxComplementoSituacaoDte]) : null,
          talent: idxTalent !== -1 ? filterPlaceholder(row[idxTalent]) : null,
          forms_preenchido: idxForms !== -1 ? filterPlaceholder(row[idxForms]) : null,
          idioma: idxIdioma !== -1 ? filterPlaceholder(row[idxIdioma]) : null,
          nome_completo: idxNomeCompleto !== -1 ? filterPlaceholder(row[idxNomeCompleto]) : null,
          email_contato: idxEmailContato !== -1 ? filterPlaceholder(row[idxEmailContato]) : null,
          empresas_restritas: idxEmpresasRestritas !== -1 ? filterPlaceholder(row[idxEmpresasRestritas]) : null,
          faixa_salarial: idxFaixaSalarial !== -1 ? filterPlaceholder(row[idxFaixaSalarial]) : null,
          carta_apresentacao: idxCarta !== -1 ? filterPlaceholder(row[idxCarta]) : null,
          lgpd: idxLgpd !== -1 ? filterPlaceholder(row[idxLgpd]) : null,
          pcd: idxPcd !== -1 ? filterPlaceholder(row[idxPcd]) : null,
          descricao_pcd: idxDescricaoPcd !== -1 ? filterPlaceholder(row[idxDescricaoPcd]) : null,
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
      const { data: existentes, error: fetchError } = await supabase
        .from("candidatos")
        .select("id, referral_id, nome_normalizado");
      if (fetchError) throw fetchError;

      const byReferral = new Map<string, string>();
      const byNome = new Map<string, string>();
      (existentes ?? []).forEach((r: any) => {
        if (r.referral_id) byReferral.set(String(r.referral_id), r.id);
        if (r.nome_normalizado) byNome.set(String(r.nome_normalizado), r.id);
      });

      // Deduplicate rows inside the spreadsheet itself (last one wins)
      const uniqueRows = new Map<string, any>();
      previewData.forEach((c) => {
        const key = c.referral_id
          ? `ref:${String(c.referral_id)}`
          : `nome:${c.nome_normalizado}`;
        uniqueRows.set(key, c);
      });

      const toInsert: any[] = [];
      const toUpdate: { id: string; row: any }[] = [];

      uniqueRows.forEach((c) => {
        const existingId =
          (c.referral_id ? byReferral.get(String(c.referral_id)) : undefined) ??
          (c.nome_normalizado ? byNome.get(String(c.nome_normalizado)) : undefined);

        if (existingId) {
          // Preserve the status already set in the portal
          const { status, ...rest } = c;
          toUpdate.push({ id: existingId, row: rest });
        } else {
          toInsert.push(c);
        }
      });

      // Insert new candidates in chunks
      const chunkSize = 50;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const { error } = await supabase
          .from("candidatos")
          .insert(toInsert.slice(i, i + chunkSize) as any);
        if (error) throw error;
      }

      // Update existing candidates by id (avoids unique-constraint conflicts)
      const updateBatch = 20;
      for (let i = 0; i < toUpdate.length; i += updateBatch) {
        const batch = toUpdate.slice(i, i + updateBatch);
        const results = await Promise.all(
          batch.map(({ id, row }) =>
            supabase.from("candidatos").update(row as any).eq("id", id),
          ),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      toast.success(
        `Importação concluída: ${toInsert.length} novos, ${toUpdate.length} atualizados.`,
      );
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

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-xs text-emerald-600 font-medium uppercase">Novos</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.novos}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium uppercase">Atualizados</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.atualizados}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 font-medium uppercase">Sem alteração</p>
                  <p className="text-2xl font-bold text-slate-700">{stats.semAlteracao}</p>
                </div>
              </div>

              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                A importação nunca apaga candidatos. Quem já existe é atualizado (mantendo o status
                atual) e quem não está na planilha permanece como está.
              </p>

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
