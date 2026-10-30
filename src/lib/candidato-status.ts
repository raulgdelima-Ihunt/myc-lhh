export type CandidatoStatus =
  | "ativo"
  | "completo_dte"
  | "completo"
  | "declinado"
  | "recolocado"
  | "inativo";

export const CANDIDATO_STATUS_OPTIONS: {
  value: CandidatoStatus;
  label: string;
  description: string;
  badgeClass: string;
  color: string;
}[] = [
  { value: "ativo", label: "Ativo", description: "Programa em andamento", badgeClass: "bg-green-50 text-green-700 ring-green-600/20", color: "#4CAF50" },
  { value: "completo_dte", label: "Completo DTE", description: "Programa completo, só conexões", badgeClass: "bg-blue-50 text-blue-700 ring-blue-600/20", color: "#2196F3" },
  { value: "completo", label: "Completo", description: "Programa encerrado", badgeClass: "bg-gray-200 text-gray-700 ring-gray-500/30", color: "#757575" },
  { value: "declinado", label: "Declinado", description: "Cancelado", badgeClass: "bg-red-50 text-red-700 ring-red-600/20", color: "#F44336" },
  { value: "recolocado", label: "Recolocado", description: "Candidato recolocado", badgeClass: "bg-[#FDF6E3] text-[#B8860B] ring-[#B8860B]/30", color: "#B8860B" },
  { value: "inativo", label: "Inativo", description: "Suspenso/congelado", badgeClass: "bg-gray-50 text-gray-400 ring-gray-300/40", color: "#BDBDBD" },
];

const ALIASES: Record<string, CandidatoStatus> = {
  ativo: "ativo",
  completo_dte: "completo_dte",
  "completo dte": "completo_dte",
  "ativo no dte": "completo_dte",
  "ativo dte": "completo_dte",
  completo: "completo",
  declinado: "declinado",
  recolocado: "recolocado",
  inativo_recolocacao: "recolocado",
  inativo: "inativo",
  inativo_termino: "inativo",
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

/** Maps any known label/legacy value to an official status, or null if unknown. */
export function toOfficialStatus(status?: string | null): CandidatoStatus | null {
  if (!status) return null;
  return ALIASES[norm(String(status))] ?? null;
}

export function getStatusMeta(status?: string | null) {
  const official = toOfficialStatus(status);
  return (
    CANDIDATO_STATUS_OPTIONS.find((o) => o.value === official) ?? {
      value: String(status || "").trim().toLowerCase() as CandidatoStatus,
      label: status ? String(status) : "Sem status",
      description: "",
      badgeClass: "bg-gray-100 text-gray-600 ring-gray-500/20",
      color: "#9E9E9E",
    }
  );
}

export function isStatusEncerrado(status?: string | null) {
  const s = toOfficialStatus(status);
  return s === "inativo" || s === "declinado" || s === "recolocado";
}
