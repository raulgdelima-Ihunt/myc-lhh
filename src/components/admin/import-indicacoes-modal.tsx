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
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

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
}

export function ImportIndicacoesModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<MappedIndication[]>([]);
  const [debugLog, setDebugLog] = useState<{ processed: string[]; ignored: string[] }>({ processed: [], ignored: [] });
  const [stats, setStats] = useState({ 
    total: 0, 
    vinculados: 0, 
    naoVinculados: 0,
    novos: 0,
    atualizacoes: 0
  });
  const [naoVinculadosNomes, setNaoVinculadosNomes] = useState<string[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const normalizeName = (name: string) => {
    if (!name) return "";
    return name
      .replace(/\([^)]*\)/g, "")
      .trim()
      .toLowerCase();
  };

  const parseExcelDate = (val: any) => {
    if (!val) return null;
    
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    
    const str = String(val).trim();
    const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
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
      
      const processed: string[] = [];
      const ignored: string[] = [];
      const allMappedData: MappedIndication[] = [];

      const { data: candidates } = await supabase
        .from("candidatos")
        .select("id, nome_normalizado");
      
      const candidatesList = candidates || [];
      const candidatesMap = new Map(candidatesList.map(c => [c.nome_normalizado, c.id]));

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        if (jsonData.length === 0) {
          ignored.push(sheetName);
          continue;
        }

        const headerRow = (jsonData[0] || []).map(h => String(h || "").trim().toLowerCase());
        const idxCliente = headerRow.indexOf("cliente");
        
        if (idxCliente === -1) {
          ignored.push(sheetName);
          continue;
        }

        processed.push(sheetName);

        const getCol = (name: string) => headerRow.findIndex(h => h.includes(name.toLowerCase()));
        
        const idxVaga = getCol("vaga");
        const idxEmpresa = getCol("empresa");
        const idxIndicacao = getCol("indicação");
        const idxLink = getCol("link");
        const idxFormato = getCol("formato");
        const idxData = getCol("data");
        const idxResultado = getCol("resultado");

        const dataRows = jsonData.slice(1);
        
        for (const row of dataRows) {
          const rawVaga = idxVaga !== -1 ? String(row[idxVaga] || "").trim() : "";
          if (!rawVaga) continue;

          const rawCliente = String(row[idxCliente] || "").trim();
          const normalizedCliente = normalizeName(rawCliente);
          
          let candidatoId: string | null = null;
          let vinculado = false;

          if (candidatesMap.has(normalizedCliente)) {
            candidatoId = candidatesMap.get(normalizedCliente) || null;
            vinculado = true;
          } else {
            const firstTwoWords = normalizedCliente.split(' ').slice(0, 2).join(' ');
            if (firstTwoWords) {
              const match = candidatesList.find(c => c.nome_normalizado.startsWith(firstTwoWords));
              if (match) {
                candidatoId = match.id;
                vinculado = true;
              }
            }
          }

          allMappedData.push({
            candidato_id: candidatoId,
            candidato_nome_original: rawCliente,
            vaga: rawVaga,
            empresa: idxEmpresa !== -1 ? String(row[idxEmpresa] || "").trim() : "-",
            indicacao_contato: idxIndicacao !== -1 && row[idxIndicacao] ? String(row[idxIndicacao]).trim() : null,
            vaga_link: idxLink !== -1 && row[idxLink] ? String(row[idxLink]).trim() : null,
            formato: idxFormato !== -1 && row[idxFormato] ? String(row[idxFormato]).trim() : null,
            data_acao: idxData !== -1 ? parseExcelDate(row[idxData]) : null,
            resultado: idxResultado !== -1 && row[idxResultado] ? String(row[idxResultado]).trim() : null,
            jobhunter: sheetName,
            vinculado
          });
        }
      }

      setDebugLog({ processed, ignored });
      setPreviewData(allMappedData);
      
      const vinculados = allMappedData.filter(d => d.vinculado).length;
      const naoVinculados = allMappedData.length - vinculados;
      const uniqueNaoVinculados = Array.from(new Set(
        allMappedData.filter(d => !d.vinculado).map(d => d.candidato_nome_original)
      )).sort();

      setStats({
        total: allMappedData.length,
        vinculados,
        naoVinculados,
        novos: 0,
        atualizacoes: 0
      });
      setNaoVinculadosNomes(uniqueNaoVinculados);

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

      const toImport = previewData.filter(d => d.vinculado && d.candidato_id);
      
      const chunkSize = 50;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const chunk = toImport.slice(i, i + chunkSize);
        
        for (const item of chunk) {
          if (!item.candidato_id) continue;

          const { data: existing } = await supabase
            .from("indicacoes")
            .select("id")
            .eq("candidato_id", item.candidato_id)
            .eq("vaga", item.vaga)
            .eq("empresa", item.empresa)
            .eq("data_acao", item.data_acao || "")
            .maybeSingle();

          const dataToUpsert = {
            candidato_id: item.candidato_id,
            vaga: item.vaga,
            empresa: item.empresa,
            indicacao_contato: item.indicacao_contato,
            vaga_link: item.vaga_link,
            formato: item.formato,
            data_acao: item.data_acao,
            resultado: item.resultado,
            jobhunter: item.jobhunter
          };

          if (existing) {
            const { error: updateError } = await supabase
              .from("indicacoes")
              .update(dataToUpsert)
              .eq("id", existing.id);
            if (updateError) throw updateError;
            updatedCount++;
          } else {
            const { error: insertError } = await supabase
              .from("indicacoes")
              .insert(dataToUpsert);
            if (insertError) throw insertError;
            insertedCount++;
          }
        }
      }

      toast.success(`${insertedCount} novas indicações, ${updatedCount} atualizadas.`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing indications:", error);
      toast.error("Erro ao importar indicações.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
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
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-100 p-3 rounded text-[11px] font-mono text-gray-700">
                Abas processadas: {debugLog.processed.join(", ") || "Nenhuma"}
                <br />
                Abas ignoradas (sem coluna 'Cliente'): {debugLog.ignored.join(", ") || "Nenhuma"}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 font-medium uppercase">Total de Linhas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <p className="text-xs text-green-600 font-medium uppercase">Vinculados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.vinculados}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 font-medium uppercase">Não Vinculados</p>
                  <p className="text-2xl font-bold text-red-900">{stats.naoVinculados}</p>
                </div>
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                  <p className="text-xs text-violet-600 font-medium uppercase">Prontos p/ Importar</p>
                  <p className="text-2xl font-bold text-violet-900">{stats.vinculados}</p>
                </div>
              </div>

              {naoVinculadosNomes.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                    <AlertCircle size={18} />
                    <span>Clientes não encontrados na base ({naoVinculadosNomes.length})</span>
                  </div>
                  <div className="text-xs text-amber-700 max-h-24 overflow-y-auto grid grid-cols-3 gap-1">
                    {naoVinculadosNomes.map((n, i) => (
                      <div key={i} className="truncate">• {n}</div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2 italic">
                    Dica: Verifique se o nome na planilha de indicações é o mesmo cadastrado na lista de candidatos.
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2">Prévia (10 primeiras linhas)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vaga</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Jobhunter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <TableRow key={i} className={!row.vinculado ? "bg-red-50/30" : ""}>
                          <TableCell>
                            {row.vinculado ? (
                              <CheckCircle2 size={16} className="text-green-600" />
                            ) : (
                              <AlertCircle size={16} className="text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]">
                            {row.candidato_nome_original}
                          </TableCell>
                          <TableCell className="truncate max-w-[150px]">{row.vaga}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{row.empresa}</TableCell>
                          <TableCell>{row.data_acao || "-"}</TableCell>
                          <TableCell className="text-gray-500">{row.jobhunter}</TableCell>
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
              disabled={isUploading || stats.vinculados === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Confirmar Importação (${stats.vinculados})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}