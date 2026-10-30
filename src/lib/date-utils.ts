// Date helpers for Postgres `date` columns ('YYYY-MM-DD').
// Never use new Date(string) / toLocaleDateString here: they shift by timezone.

export const DEFAULT_ACTION_DATE = "1900-01-01";

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY'; null/empty/sentinel -> '—'. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = String(value).trim().slice(0, 10);
  if (!iso || iso === DEFAULT_ACTION_DATE) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

/** Today's local calendar date as 'YYYY-MM-DD'. */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Real action date: not empty, not sentinel, not in the future. */
export function isRealPastDate(value: string | null | undefined, today: string = todayISO()): boolean {
  if (!value) return false;
  const iso = value.slice(0, 10);
  if (iso === DEFAULT_ACTION_DATE) return false;
  return iso <= today;
}

/** Sort comparator: newest first by ISO string, sentinel/null last. */
export function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  const ea = !a || a === DEFAULT_ACTION_DATE;
  const eb = !b || b === DEFAULT_ACTION_DATE;
  if (ea && eb) return 0;
  if (ea) return 1;
  if (eb) return -1;
  return a! < b! ? 1 : a! > b! ? -1 : 0;
}

/** Latest real (non-sentinel, non-future) date, or null. */
export function latestRealDate(dates: (string | null | undefined)[], today: string = todayISO()): string | null {
  let best: string | null = null;
  for (const d of dates) {
    if (isRealPastDate(d, today) && (!best || d! > best)) best = d!.slice(0, 10);
  }
  return best;
}

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Rows with jobhunter 'Distribuição' are the distribution record, not indications. */
export function isDistribuicao(row: { jobhunter?: string | null }): boolean {
  return normalizeText(row.jobhunter) === "distribuicao";
}

export function isEntrevistaGerada(resultado: string | null | undefined): boolean {
  return normalizeText(resultado).includes("entrevista gerada");
}

/** Splits raw rows into real indications (sorted newest first) and the distribution date. */
export function splitIndicacoes<T extends { jobhunter?: string | null; data_acao?: string | null }>(rows: T[]) {
  const indicacoes = rows.filter((r) => !isDistribuicao(r)).sort((a, b) => compareDateDesc(a.data_acao, b.data_acao));
  const distrib = rows.filter(isDistribuicao).map((r) => r.data_acao);
  const distribuidoEm = distrib.filter((d) => d && d !== DEFAULT_ACTION_DATE).sort()[0] ?? null;
  return { indicacoes, distribuidoEm };
}

/** Days between two ISO dates (absolute). Uses UTC math on parts — no timezone shift. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  };
  return Math.abs(Math.round((toUtc(a) - toUtc(b)) / 86400000));
}

// ---------- Import parsing ----------

type Parts = { y: number; m: number; d: number };
export type ColumnFormat = "DMY" | "MDY" | "MIXED" | "NONE";

const TEXT_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})/;

function toISO(p: Parts) {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function isCalendarValid(p: Parts): boolean {
  if (p.m < 1 || p.m > 12 || p.d < 1) return false;
  const dim = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
  return p.d <= dim;
}

function addMonthsISO(today: string, months: number) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1 + months, d!));
  return dt.toISOString().slice(0, 10);
}
function addDaysISO(today: string, days: number) {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

/** Scans text values of a column: first number > 12 → DMY, second > 12 → MDY, both → MIXED. */
export function detectColumnFormat(values: unknown[]): ColumnFormat {
  let dmy = false;
  let mdy = false;
  for (const v of values) {
    if (typeof v !== "string") continue;
    const m = v.trim().match(TEXT_DATE);
    if (!m) continue;
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (dmy && mdy) return "MIXED";
  if (dmy) return "DMY";
  if (mdy) return "MDY";
  return "NONE";
}

export type DateKind = "action" | "retorno";
export interface ResolvedDate {
  iso: string | null;
  corrected: boolean;
  invalid: boolean;
}

/**
 * Converts a spreadsheet cell to ISO with format detection and plausibility:
 * action window = [today − 18 months, today + 1 day]; retorno window ends at today + 60 days.
 * If the reading is implausible but the day/month swap is plausible, the swap wins.
 */
export function resolveSheetDate(
  val: unknown,
  format: ColumnFormat,
  kind: DateKind = "action",
  serialToParts?: (n: number) => Parts | null,
  today: string = todayISO(),
): ResolvedDate {
  if (val === null || val === undefined || val === "") return { iso: null, corrected: false, invalid: false };

  let primary: Parts | null = null;
  let swapped: Parts | null = null;

  if (typeof val === "number") {
    primary = serialToParts ? serialToParts(val) : null;
  } else if (val instanceof Date) {
    if (!isNaN(val.getTime())) primary = { y: val.getUTCFullYear(), m: val.getUTCMonth() + 1, d: val.getUTCDate() };
  } else {
    const str = String(val).trim();
    if (!str) return { iso: null, corrected: false, invalid: false };
    const t = str.match(TEXT_DATE);
    const i = str.match(ISO_DATE);
    if (t) {
      const a = Number(t[1]);
      const b = Number(t[2]);
      let y = Number(t[3]);
      if (y < 100) y += 2000;
      let useMDY: boolean;
      if (a > 12) useMDY = false;
      else if (b > 12) useMDY = true;
      else useMDY = format === "MDY";
      primary = useMDY ? { y, m: a, d: b } : { y, m: b, d: a };
    } else if (i) {
      primary = { y: Number(i[1]), m: Number(i[2]), d: Number(i[3]) };
    }
  }

  if (!primary) return { iso: null, corrected: false, invalid: true };
  swapped = { y: primary.y, m: primary.d, d: primary.m };

  const min = addMonthsISO(today, -18);
  const max = kind === "retorno" ? addDaysISO(today, 60) : addDaysISO(today, 1);
  const plausible = (p: Parts) => isCalendarValid(p) && toISO(p) >= min && toISO(p) <= max;

  if (plausible(primary)) return { iso: toISO(primary), corrected: false, invalid: false };
  if (plausible(swapped)) return { iso: toISO(swapped), corrected: true, invalid: false };
  return { iso: null, corrected: false, invalid: true };
}
