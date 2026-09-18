export type CandidatoStatus =
  | "ativo"
  | "completo"
  | "inativo_termino"
  | "inativo_recolocacao"
  | "declinado";

export const CANDIDATO_STATUS_OPTIONS: {
  value: CandidatoStatus;
  label: string;
  description: string;
  badgeClass: string;
}[] = [
  {
    value: "ativo",
    label: "Ativo",
    description: "Programa em andamento",
    badgeClass: "bg-green-50 text-green-700 ring-green-600/20",
  },
  {
    value: "completo",
    label: "Completo",
    description: "Prazo encerrado, indicações por 3 meses",
    badgeClass: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  {
    value: "inativo_termino",
    label: "Inativo - Término",
    description: "Encerrado por término de prazo",
    badgeClass: "bg-gray-100 text-gray-600 ring-gray-500/20",
  },
  {
    value: "inativo_recolocacao",
    label: "Inativo - Recolocação",
    description: "Recolocado no mercado",
    badgeClass: "bg-[#FDF6E3] text-[#B8860B] ring-[#B8860B]/30",
  },
  {
    value: "declinado",
    label: "Declinado",
    description: "Cancelamento do programa",
    badgeClass: "bg-red-50 text-red-700 ring-red-600/20",
  },
];

export function getStatusMeta(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  return (
    CANDIDATO_STATUS_OPTIONS.find((option) => option.value === normalized) ?? {
      value: normalized as CandidatoStatus,
      label: status ? String(status) : "Sem status",
      description: "",
      badgeClass: "bg-gray-100 text-gray-600 ring-gray-500/20",
    }
  );
}

export function isStatusEncerrado(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized.startsWith("inativo") || normalized === "declinado";
}
