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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, AlertCircle, CheckCircle2, UserPlus, EyeOff } from "lucide-react";
import { normalizeNameAggressive, getSimilarCandidates } from "@/lib/string-utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface MappedIndication {
  candidato_id: string | null;
  candidato_nome_original: string;
  vaga: string;
  empresa: string;
  indicacao_contato: string | null;
  vaga_link: string | null;
  formato: string | null;
  data_acao: string | null;
  resultado: string | null;
  jobhunter: string;
  vinculado: boolean;
  manual_ignore?: boolean;
  importStatus?: "new" | "existing";
  suggestions?: { id: string; nome: string }[];
}

const DEFAULT_ACTION_DATE = "1900-01-01";

function getActionDateForStorage(date: string | null | undefined) {
  return date || DEFAULT_ACTION_DATE;
}

function getActionDateForDisplay(date: string | null | undefined) {
  return !date || date === DEFAULT_ACTION_DATE ? "-" : date;
}

function buildDedupKey(
  candidatoId: string | null | undefined,
  vaga: string | null | undefined,
  empresa: string | null | undefined,
  dataAcao: string | null | undefined,
) {
  return [
    candidatoId || "",
    String(vaga || "").trim(),
    String(empresa || "").trim(),
    getActionDateForStorage(dataAcao),
  ].join("||");
}

function recomputeImportStatus(data: MappedIndication[], existingKeys: Set<string>) {
  const seenKeys = new Set<string>();

  return data.map((item): MappedIndication => {
    if (!item.vinculado || !item.candidato_id || item.manual_ignore) {
      const itemWithoutStatus = { ...item };
      delete itemWithoutStatus.importStatus;
      return itemWithoutStatus;
    }

    const dataAcao = getActionDateForStorage(item.data_acao);
    const key = buildDedupKey(item.candidato_id, item.vaga, item.empresa, dataAcao);
    const importStatus = existingKeys.has(key) || seenKeys.has(key) ? "existing" : "new";
    seenKeys.add(key);

    return { ...item, data_acao: dataAcao, importStatus };
  });
}

export function ImportIndicacoesModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<MappedIndication[]>([]);
  const [debugLog, setDebugLog] = useState<{ processed: string[]; ignored: { name: string; reason: string }[] }>({ processed: [], ignored: [] });
  const [stats, setStats] = useState({ 
    total: 0, 
    vinculados: 0, 
    naoVinculados: 0,
    novos: 0,
    existentes: 0
  });
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);
  const [existingDedupKeys, setExistingDedupKeys] = useState<Set<string>>(new Set());


  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);


  const parseExcelDate = (val: any) => {
    if (!val) return null;
    
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    
    const str = String(val).trim();
    const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts && parts[1] && parts[2] && parts[3]) {
      return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const processedSheets: string[] = [];
      const ignoredSheets: { name: string; reason: string }[] = [];
      const allMappedData: MappedIndication[] = [];

      const { data: candidates } = await (supabase
        .from("candidatos")
        .select("id, nome, nome_normalizado, referral_id") as any);
      
      const candidatesList = ((candidates || []) as any[]).map((c) => ({
        ...c,
        // Accent-free, lowercase, single-spaced key used for all matching
        matchKey: normalizeNameAggressive(c.nome || c.nome_normalizado || ""),
      }));
      const candidatesByName = new Map<string, string>();
      candidatesList.forEach((c) => {
        if (c.matchKey && !candidatesByName.has(c.matchKey)) candidatesByName.set(c.matchKey, c.id);
        const alt = normalizeNameAggressive(c.nome_normalizado || "");
        if (alt && !candidatesByName.has(alt)) candidatesByName.set(alt, c.id);
      });
      const candidatesByReferral = new Map(
        candidatesList.filter(c => c.referral_id).map(c => [String(c.referral_id).trim(), c.id])
      );

      const loadedExistingKeys = new Set<string>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data: existingRows, error: existingError } = await (supabase
          .from("indicacoes")
          .select("candidato_id,vaga,empresa,data_acao")
          .range(from, from + pageSize - 1) as any);

        if (existingError) throw existingError;

        const rows = existingRows || [];
        rows.forEach((row: any) => {
          loadedExistingKeys.add(buildDedupKey(row.candidato_id, row.vaga, row.empresa, row.data_acao));
        });

        if (rows.length < pageSize) break;
      }

      setExistingDedupKeys(loadedExistingKeys);

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        if (jsonData.length === 0) {
          ignoredSheets.push({ name: sheetName, reason: "Aba vazia" });
          continue;
        }

        const headerRowIndex = 0; // Assuming header is at line 1
        const headerRow = (jsonData[headerRowIndex] || []).map(h => String(h || "").trim().toLowerCase());
        const getCol = (patterns: string[]) => headerRow.findIndex(h => patterns.some(p => h.includes(p.toLowerCase())));
        
        const idxAcao = getCol(["ação", "indicação", "acao", "indicacao"]);
        const idxVaga = getCol(["vaga", "posição", "posicao", "vagas"]);
        const idxEmpresa = getCol(["empresa", "consultoria", "empresa/consultoria"]);
        
        if (idxAcao === -1 || idxVaga === -1 || idxEmpresa === -1) {
          const missing = [];
          if (idxAcao === -1) missing.push("Ação/Indicação");
          if (idxVaga === -1) missing.push("Vaga/Posição");
          if (idxEmpresa === -1) missing.push("Empresa");
          ignoredSheets.push({ name: sheetName, reason: `Colunas ausentes: ${missing.join(", ")}` });
          continue;
        }

        processedSheets.push(sheetName);
        
        const idxReferral = getCol(["referral"]);
        const idxNome = getCol(["nome", "cliente", "assessorado"]);
        const idxOrigem = getCol(["origem"]);
        const idxLink = getCol(["link"]);
        const idxLinkedin = getCol(["linkedin_candidato", "linkedin"]);
        const idxDataAcao = getCol(["data ação", "data acao", "data"]);
        const idxDataRetorno = getCol(["data retorno"]);
        const idxFollowUp = getCol(["follow up"]);
        const idxFunil = getCol(["funil"]);
        const idxStatus = getCol(["status", "resultado"]);
        const idxTalent = getCol(["talent"]);
        const idxObs = getCol(["obs", "observações", "observacoes"]);

        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        const filterPlaceholder = (val: any) => {
          if (val === null || val === undefined) return null;
          const str = String(val).trim();
          const placeholders = ["não identificad", "não cadastrado", "não encontrad", "Nenhum cargo", "Nenhuma empresa"];
          if (placeholders.some(p => str.toLowerCase().includes(p.toLowerCase()))) return null;
          return str || null;
        };

        for (const row of dataRows) {
          const rawReferral = idxReferral !== -1 ? filterPlaceholder(row[idxReferral]) : null;
          const rawNome = idxNome !== -1 ? filterPlaceholder(row[idxNome]) : null;
          const rawVaga = idxVaga !== -1 ? filterPlaceholder(row[idxVaga]) : null;
          const rawEmpresa = idxEmpresa !== -1 ? filterPlaceholder(row[idxEmpresa]) : null;
          
          if (!rawVaga && !rawNome && !rawReferral) continue;

          let candidatoId: string | null = null;
          let vinculado = false;

          const normNomePlanilha = normalizeNameAggressive(rawNome || "");

          // Step 1: Referral ID
          if (rawReferral && candidatesByReferral.has(rawReferral)) {
            candidatoId = candidatesByReferral.get(rawReferral) || null;
            vinculado = true;
          } 
          
          // Step 2: Exact Normalized Name
          if (!vinculado && normNomePlanilha) {
            if (candidatesByName.has(normNomePlanilha)) {
              candidatoId = candidatesByName.get(normNomePlanilha) || null;
              vinculado = true;
            } 
          }

          // Step 3: Partial Match (First 2 words, accent-insensitive)
          if (!vinculado && normNomePlanilha) {
            const firstTwoWords = normNomePlanilha.split(' ').slice(0, 2).join(' ');
            if (firstTwoWords.length > 5) {
              const match = candidatesList.find(c => c.matchKey.startsWith(firstTwoWords));
              if (match) {
                candidatoId = match.id;
                vinculado = true;
              }
            }
          }

          const suggestions = !vinculado && normNomePlanilha 
            ? getSimilarCandidates(normNomePlanilha, candidatesList)
            : [];

          allMappedData.push({
            candidato_id: candidatoId,
            candidato_nome_original: rawNome || `Ref: ${rawReferral}`,
            vaga: rawVaga || "Vaga não informada",
            empresa: rawEmpresa || "-",
            indicacao_contato: idxTalent !== -1 ? filterPlaceholder(row[idxTalent]) : null,
            vaga_link: idxLink !== -1 ? filterPlaceholder(row[idxLink]) : null,
            formato: null, 
            data_acao: idxDataAcao !== -1 ? getActionDateForStorage(parseExcelDate(row[idxDataAcao]) as string | null) : DEFAULT_ACTION_DATE,
            resultado: idxStatus !== -1 ? filterPlaceholder(row[idxStatus]) : null,
            jobhunter: sheetName,
            vinculado,
            suggestions: suggestions.map(s => ({ id: s.id, nome: s.nome })),
            origem: idxOrigem !== -1 ? filterPlaceholder(row[idxOrigem]) : null,
            linkedin_candidato: idxLinkedin !== -1 ? filterPlaceholder(row[idxLinkedin]) : null,
            data_retorno: idxDataRetorno !== -1 ? parseExcelDate(row[idxDataRetorno]) : null,
            follow_up: idxFollowUp !== -1 ? filterPlaceholder(row[idxFollowUp]) : null,
            funil: idxFunil !== -1 ? filterPlaceholder(row[idxFunil]) : null,
            observacoes: idxObs !== -1 ? filterPlaceholder(row[idxObs]) : null,
          } as any);
        }
      }

      setDebugLog({ processed: processedSheets, ignored: ignoredSheets });
      const dataWithStatus = recomputeImportStatus(allMappedData, loadedExistingKeys);
      setPreviewData(dataWithStatus);
      updateStats(dataWithStatus);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erro ao processar o arquivo Excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStats = (data: MappedIndication[]) => {
    const vinculadosCount = data.filter(d => d.vinculado && !d.manual_ignore).length;
    const existentesCount = data.filter(d => d.vinculado && !d.manual_ignore && d.importStatus === "existing").length;
    setStats({
      total: data.length,
      vinculados: vinculadosCount,
      naoVinculados: data.filter(d => !d.vinculado && !d.manual_ignore).length,
      novos: data.filter(d => d.vinculado && !d.manual_ignore && d.importStatus !== "existing").length,
      existentes: existentesCount
    });
  };

  // Applies one decision to EVERY row with the same name in the spreadsheet
  const handleManualVinculation = (nomeKey: string, candidatoId: string | 'ignore') => {
    setPreviewData(prev => {
      const newData = prev.map((item) => {
        if (item.vinculado) return item;
        if (normalizeNameAggressive(item.candidato_nome_original) !== nomeKey) return item;
        return candidatoId === 'ignore'
          ? ({ ...item, vinculado: false, manual_ignore: true, candidato_id: null } as MappedIndication)
          : ({ ...item, vinculado: true, manual_ignore: false, candidato_id: candidatoId } as MappedIndication);
      });
      const dataWithStatus = recomputeImportStatus(newData, existingDedupKeys);
      updateStats(dataWithStatus);
      return dataWithStatus;
    });
  };

  // One decision per distinct unmatched name, with its occurrence count
  const unlinkedGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      { key: string; nome: string; count: number; ignored: boolean; suggestions: { id: string; nome: string }[] }
    >();
    previewData.forEach((row) => {
      if (row.vinculado) return;
      const key = normalizeNameAggressive(row.candidato_nome_original);
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          key,
          nome: row.candidato_nome_original,
          count: 1,
          ignored: Boolean(row.manual_ignore),
          suggestions: row.suggestions ?? [],
        });
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [previewData]);




  const handleConfirmImport = async () => {
    if (!previewData.length) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let insertedCount = 0;
      const toImport = previewData.filter(d => d.vinculado && d.candidato_id && !d.manual_ignore && d.importStatus !== "existing");
      const totalItems = toImport.length;
      
      const chunkSize = 20;
      for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = toImport.slice(i, i + chunkSize);
        const dados = chunk
          .filter((item) => item.candidato_id)
          .map((item) => ({
            candidato_id: item.candidato_id,
            vaga: item.vaga,
            empresa: item.empresa,
            indicacao_contato: item.indicacao_contato,
            vaga_link: item.vaga_link,
            formato: item.formato,
            data_acao: getActionDateForStorage(item.data_acao),
            resultado: item.resultado,
            jobhunter: item.jobhunter,
            origem: (item as any).origem,
            linkedin_candidato: (item as any).linkedin_candidato,
            data_retorno: (item as any).data_retorno,
            follow_up: (item as any).follow_up,
            observacoes: (item as any).observacoes,
          }));

        if (dados.length > 0) {
          const { error: upsertError } = await (supabase
            .from("indicacoes")
            .upsert(dados as any, {
              onConflict: "candidato_id,vaga,empresa,data_acao",
              ignoreDuplicates: true,
            }) as any);

          if (upsertError) {
            console.error("Upsert error details:", upsertError);
            throw upsertError;
          }

          insertedCount += dados.length;
        }

        const currentProgress = Math.min(Math.round(((i + chunk.length) / totalItems) * 100), 100);
        setUploadProgress(currentProgress);
      }

      toast.success(`${insertedCount} novas indicações importadas. ${stats.existentes} já existentes ignoradas.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error importing indications:", error);
      toast.error(`Erro ao importar indicações: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Indicações (Excel)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {!file ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-violet-400 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">Selecione o arquivo .xlsx com as abas dos Jobhunters</p>
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
              <p>Processando abas e vinculando clientes...</p>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="w-full max-w-md bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-violet-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-lg font-medium text-violet-900">{uploadProgress}% completo</p>
              <p className="text-sm text-gray-500 italic">Gravando indicações vinculadas no banco de dados...</p>
            </div>
          ) : (

            <div className="space-y-6">
              <div className="bg-gray-100 p-3 rounded text-[11px] font-mono text-gray-700">
                <div className="font-bold text-violet-700 mb-1">Abas processadas: {debugLog.processed.join(", ") || "Nenhuma"}</div>
                {debugLog.ignored.length > 0 && (
                  <div className="text-amber-700 mt-2">
                    <span className="font-bold">Abas ignoradas:</span>
                    <ul className="list-disc pl-4 mt-1">
                      {debugLog.ignored.map((item, i) => (
                        <li key={i}>{item.name}: {item.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center bg-violet-50 p-4 rounded-lg border border-violet-100">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-violet-600 font-medium uppercase">Total</p>
                    <p className="text-2xl font-bold text-violet-900">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium uppercase">Vinculados</p>
                    <p className="text-2xl font-bold text-green-900">{stats.vinculados}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600 font-medium uppercase">Não Vinculados</p>
                    <p className="text-2xl font-bold text-red-900">{stats.naoVinculados}</p>
                  </div>
                  <div>
                    <p className="text-xs text-violet-600 font-medium uppercase">Novas</p>
                    <p className="text-2xl font-bold text-violet-900">{stats.novos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium uppercase">Já existentes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.existentes}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md border shadow-sm">
                  <input
                    type="checkbox"
                    id="show-only-unlinked"
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    checked={showOnlyUnlinked}
                    onChange={(e) => setShowOnlyUnlinked(e.target.checked)}
                  />
                  <label htmlFor="show-only-unlinked" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Mostrar apenas não vinculados
                  </label>
                </div>
              </div>


              {unlinkedGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Nomes a vincular ({unlinkedGroups.length})
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Uma decisão por nome — aplicada a todas as indicações desse nome.
                    </span>
                  </h3>
                  <div className="space-y-2 max-h-[260px] overflow-auto rounded-lg border p-3">
                    {unlinkedGroups.map((group) => (
                      <div
                        key={group.key}
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${group.ignored ? "bg-gray-50 opacity-60" : "bg-amber-50/40"}`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{group.nome}</p>
                          <p className="text-xs text-gray-500">{group.count} indicaç{group.count === 1 ? "ão" : "ões"}</p>
                        </div>
                        <Select
                          onValueChange={(val) => handleManualVinculation(group.key, val)}
                          value={group.ignored ? "ignore" : ""}
                        >
                          <SelectTrigger className="h-8 w-[280px] text-xs border-amber-300 bg-white">
                            <SelectValue placeholder="Selecione um candidato..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore" className="text-red-600 font-medium">
                              Ignorar (não é candidato)
                            </SelectItem>
                            {group.suggestions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>É este: {s.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  Prévia
                  <span className="text-xs font-normal text-gray-500">({stats.novos} novas | {stats.existentes} já existentes serão ignoradas)</span>
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Nome na Planilha</TableHead>
                        <TableHead>Vinculação / Sugestões</TableHead>
                        <TableHead>Vaga</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {previewData
                        .filter(row => !showOnlyUnlinked || (!row.vinculado && !row.manual_ignore))
                        .slice(0, 100)
                        .map((row, i) => (
                        <TableRow key={i} className={!row.vinculado && !row.manual_ignore ? "bg-red-50/30" : row.manual_ignore ? "bg-gray-50 opacity-60" : ""}>

                          <TableCell>
                            {row.vinculado ? (
                              <CheckCircle2 size={16} className="text-green-600" />
                            ) : row.manual_ignore ? (
                              <EyeOff size={16} className="text-gray-400" />
                            ) : (
                              <AlertCircle size={16} className="text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]">
                            {row.candidato_nome_original}
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            {row.vinculado ? (
                              <div className={`text-[11px] font-medium flex items-center gap-1 ${row.importStatus === "existing" ? "text-gray-500" : "text-green-700"}`}>
                                <UserPlus size={12} /> {row.importStatus === "existing" ? "Já existente" : "Nova indicação"}
                              </div>
                            ) : row.manual_ignore ? (
                              <span className="text-[11px] font-medium text-gray-500">Ignorado</span>
                            ) : (
                              <span className="text-[11px] font-medium text-amber-700">
                                Aguardando vinculação acima
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="truncate max-w-[150px]">{row.vaga}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{row.empresa}</TableCell>
                          <TableCell>{getActionDateForDisplay(row.data_acao)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {previewData.filter(row => !showOnlyUnlinked || (!row.vinculado && !row.manual_ignore)).length > 100 && (
                    <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
                      Mostrando apenas os primeiros 100 de {previewData.filter(row => !showOnlyUnlinked || (!row.vinculado && !row.manual_ignore)).length} registros filtrados.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          {file && !isProcessing && !isUploading && (
            <Button 
              onClick={handleConfirmImport} 
              disabled={isUploading || stats.novos === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Confirmar Importação ({stats.novos})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


