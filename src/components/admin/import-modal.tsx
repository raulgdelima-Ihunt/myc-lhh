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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, "") // Remove contents in parentheses
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const normalizeHeader = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const inferNivelCargo = (posicao: unknown) => {
    const text = normalizeHeader(String(posicao ?? ""));
    if (!text || text.includes("nenhum cargo encontrado")) return "Não identificado";
    if (/\b(ceo|cfo|coo|cto|cmo|chro|vp|vice[- ]presidente|presidente|c[- ]level|chief)\b/.test(text)) return "C-Level";
    if (/\b(diretor|diretora)\b/.test(text)) return "Diretor";
    if (/\b(gerente|head|lider|superintendente)\b/.test(text)) return "Gerente";
    if (/\b(coordenador|coordenadora|supervisor|supervisora)\b/.test(text)) return "Coordenador";
    return "Especialista";
  };

  const inferArea = (values: unknown[]) => {
    const text = normalizeHeader(values.filter(Boolean).join(" "));
    if (!text) return null;

    const rules: [RegExp, string][] = [
      [/\b(rh|recursos humanos|gente|people|talentos|talent|dp)\b/, "Recursos Humanos"],
      [/\b(tecnologia|ti|it|sistemas|software|dados|data|digital|produto)\b/, "Tecnologia"],
      [/\b(financeiro|financas|controladoria|contabil|contabilidade|tesouraria|fp&a|auditoria)\b/, "Financeiro"],
      [/\b(comercial|vendas|sales|business development|bd|trade)\b/, "Comercial"],
      [/\b(marketing|marca|branding|comunicacao|growth)\b/, "Marketing"],
      [/\b(operacoes|operacional|operations|industrial|manufatura|producao)\b/, "Operações"],
      [/\b(juridico|legal|compliance|regulatorio)\b/, "Jurídico"],
      [/\b(supply|logistica|logistics|compras|procurement|suprimentos)\b/, "Supply Chain"],
      [/\b(engenharia|engineering|qualidade|quality|hse|ehs)\b/, "Engenharia"],
      [/\b(projetos|pmo|project)\b/, "Projetos"],
      [/\b(atendimento|customer|cliente|cs|sucesso do cliente)\b/, "Atendimento"],
      [/\b(administrativo|administracao|facilities)\b/, "Administrativo"],
    ];

    return rules.find(([pattern]) => pattern.test(text))?.[1] ?? null;
  };

  const stripEmptyUpdateValues = (row: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== ""),
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Only the "Candidatos" sheet is valid (ignore Orbit, DTE, Forms...)
      const targetSheetName =
        workbook.SheetNames.find((n) => normalizeHeader(n) === "candidatos") ?? "";
      const worksheet = targetSheetName ? workbook.Sheets[targetSheetName] : undefined;
      if (!worksheet) {
        toast.error("Aba 'Candidatos' não encontrada no arquivo.");
        setFile(null);
        return;
      }
      const finalJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

      // Header: first row where cell A == "Referral" and cell B contains "Nome"
      const foundHeaderRow = finalJsonData.findIndex((r) => {
        const a = normalizeHeader(String(r?.[0] ?? ""));
        const b = normalizeHeader(String(r?.[1] ?? ""));
        return a === "referral" && b.includes("nome");
      });
      if (foundHeaderRow === -1) {
        toast.error("Cabeçalho (Referral | Nome) não encontrado na aba 'Candidatos'.");
        setFile(null);
        return;
      }

      const headerRowData = finalJsonData[foundHeaderRow]!;
      const headers = headerRowData.map(h => String(h || "").trim());
      const dataRows = finalJsonData.slice(foundHeaderRow + 1);

      // Mapping logic
      const normalizedHeaders = headers.map(normalizeHeader);

      const getColumnIndex = (patterns: string[]) => {
        const normalizedPatterns = patterns.map(normalizeHeader);
        return headers.findIndex((h) => {
          const lowerH = normalizeHeader(h);
          return normalizedPatterns.some(p => lowerH.includes(p));
        });
      };

      // Exact header match (used when similar headers exist, e.g. "Status" vs "Status DTE")
      const getExactColumnIndex = (patterns: string[]) => {
        const normalizedPatterns = patterns.map(normalizeHeader);
        return normalizedHeaders.findIndex((lowerH) => normalizedPatterns.some(p => lowerH === p));
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
      const idxReferralId = getExactColumnIndex(["REFERRAL ID"]);
      const idxReferral = idxReferralId !== -1 ? idxReferralId : getColumnIndex(["REFERRAL"]);
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
      const idxArea = getColumnIndex(["ÁREA", "AREA", "ÁREA DE ATUAÇÃO", "AREA DE ATUACAO"]);
      const idxNivel = getColumnIndex(["NÍVEL DE CARGO", "NIVEL DE CARGO", "SENIORIDADE"]);
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
      let totalLinhas = 0;

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
        totalLinhas += 1;

        // Mandatory filter: only "Ativo" or "Ativo no DTE"
        const statusPlanilha = normalizeHeader(String(idxStatusProg !== -1 ? row[idxStatusProg] ?? "" : ""));
        if (statusPlanilha !== "ativo" && statusPlanilha !== "ativo no dte") {
          lastCandidate = null;
          return;
        }

        const ultimoSeg = idxUltimoSeg !== -1 ? filterPlaceholder(row[idxUltimoSeg]) : null;
        const areaFromSheet = ultimoSeg ?? (idxArea !== -1 ? filterPlaceholder(row[idxArea]) : null);
        const nivelFromSheet = null;
        const roleSources = idxUltimaPos !== -1 ? row[idxUltimaPos] : null;
        const areaSources: unknown[] = [];

        const candidate = {
          referral_id: valReferral,
          nome: rawNome.replace(/\([^)]*\)/g, "").trim(),
          nome_normalizado: normalizeName(rawNome),
          email: idxEmail !== -1
            ? filterPlaceholder(row[idxEmail])?.toLowerCase().trim() ?? null
            : null,
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
          area: areaFromSheet || inferArea(areaSources) || null,
          nivel_cargo: nivelFromSheet || inferNivelCargo(roleSources),
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
        totalBeforeFilter: totalLinhas,
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
        if (row.nome_normalizado && String(row.status || "").toLowerCase() !== "duplicado") byNome.set(String(row.nome_normalizado), row);
      });

      let novos = 0;
      let atualizados = 0;
      let semAlteracao = 0;

      mappedData.forEach((c) => {
        const legacy = byNome.get(c.nome_normalizado);
        const existing =
          (c.referral_id && byReferral.get(String(c.referral_id))) ||
          (legacy && !legacy.referral_id ? legacy : undefined);

        if (!existing) {
          novos += 1;
          return;
        }

        const changed = Object.keys(c).some((key) => {
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
        .select("id, referral_id, nome_normalizado, status");
      if (fetchError) throw fetchError;

      const byReferral = new Map<string, string>();
      const byNome = new Map<string, { id: string; referral_id: string | null }>();
      const allNomes = new Set<string>();
      (existentes ?? []).forEach((r: any) => {
        if (r.nome_normalizado) allNomes.add(String(r.nome_normalizado));
        if (r.referral_id) byReferral.set(String(r.referral_id), r.id);
        if (r.nome_normalizado && String(r.status || "").toLowerCase() !== "duplicado")
          byNome.set(String(r.nome_normalizado), { id: r.id, referral_id: r.referral_id ?? null });
      });

      // Deduplicate rows inside the spreadsheet itself (last one wins)
      const uniqueRows = new Map<string, any>();
      previewData.forEach((c) => {
        const key = c.referral_id
          ? `ref:${String(c.referral_id)}`
          : `nome:${c.nome_normalizado}`;
        uniqueRows.set(key, c);
      });

      // Resolve Talent -> conector_id (case/accent-insensitive), creating missing conectores
      const normCon = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      const { data: conectoresDb, error: conErr } = await supabase
        .from("conectores")
        .select("id, nome");
      if (conErr) throw conErr;
      const conMap = new Map<string, string>();
      (conectoresDb ?? []).forEach((c: any) => conMap.set(normCon(c.nome), c.id));
      const talentNames = new Map<string, string>();
      uniqueRows.forEach((c) => {
        if (c.talent) talentNames.set(normCon(String(c.talent)), String(c.talent).trim());
      });
      for (const [key, nome] of talentNames) {
        if (conMap.has(key)) continue;
        console.warn(`[Importação] Conector "${nome}" não encontrado — criando automaticamente.`);
        const { data: novo, error } = await supabase
          .from("conectores")
          .insert({ nome, email: "" })
          .select("id")
          .single();
        if (error) {
          console.warn(`[Importação] Falha ao criar conector "${nome}":`, error.message);
          continue;
        }
        conMap.set(key, novo.id);
      }
      uniqueRows.forEach((c) => {
        c.conector_id = c.talent ? conMap.get(normCon(String(c.talent))) ?? null : null;
      });

      const toInsert: any[] = [];
      const toUpdate: { id: string; row: any }[] = [];

      uniqueRows.forEach((c) => {
        // Referral ID is the permanent key. Legacy records (no referral) with the
        // same normalized name are adopted and receive the referral.
        const refId = c.referral_id ? byReferral.get(String(c.referral_id)) : undefined;
        const legacy = c.nome_normalizado ? byNome.get(String(c.nome_normalizado)) : undefined;
        const existingId = refId ?? (legacy && !legacy.referral_id ? legacy.id : undefined);

        if (existingId) {
          if (!refId && legacy) legacy.referral_id = String(c.referral_id ?? "");
          toUpdate.push({ id: existingId, row: stripEmptyUpdateValues(c) });
        } else {
          // Name collides with another referral: keep nome_normalizado unique
          if (c.referral_id && allNomes.has(String(c.nome_normalizado))) c.nome_normalizado = `${c.nome_normalizado}#${c.referral_id}`;
          allNomes.add(String(c.nome_normalizado));
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
                  <div>Aba selecionada: {debugInfo.sheetName} | Linha do cabeçalho encontrada: {debugInfo.headerRow}</div>
                  <div>Total na planilha: {debugInfo.totalBeforeFilter} | Ativos filtrados: {debugInfo.totalAfterFilter} | Ignorados (completo/inativo): {debugInfo.totalBeforeFilter - debugInfo.totalAfterFilter}</div>
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
                A importação nunca apaga candidatos. O Referral ID é a chave: quem já existe é atualizado
                com os dados da planilha e quem não está na planilha permanece como está.
              </p>

              <div>

                <h3 className="text-sm font-semibold mb-2">Prévia (10 primeiras linhas)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referral</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Consultor</TableHead>
                        <TableHead>Talent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nível Cargo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-[10px]">{row.referral_id || "-"}</TableCell>
                          <TableCell className="font-medium">{row.nome}</TableCell>
                          <TableCell>{row.consultor_responsavel || "-"}</TableCell>
                          <TableCell>{row.talent || "-"}</TableCell>
                          <TableCell>{row.status_programa || "-"}</TableCell>
                          <TableCell>{row.nivel_cargo || "-"}</TableCell>
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
