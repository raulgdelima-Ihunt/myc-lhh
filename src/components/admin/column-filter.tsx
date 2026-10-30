import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const EMPTY_LABEL = "(Vazio)";

type Accessors<T> = Record<string, (row: T) => string | null | undefined>;

const toValue = (v: string | null | undefined) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" || s === "—" ? EMPTY_LABEL : s;
};

/** Excel-style per-column filters. A column with no entry in `filters` is unfiltered. */
export function useColumnFilters<T>(rows: T[], accessors: Accessors<T>) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const filtered = useMemo(() => {
    const active = Object.entries(filters);
    if (active.length === 0) return rows;
    return rows.filter((r) =>
      active.every(([key, allowed]) => allowed.includes(toValue(accessors[key]?.(r)))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters]);

  const valuesFor = (key: string) => {
    const set = new Set(rows.map((r) => toValue(accessors[key]?.(r))));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  };

  const setFilter = (key: string, selected: string[] | null) =>
    setFilters((prev) => {
      const next = { ...prev };
      if (selected === null) delete next[key];
      else next[key] = selected;
      return next;
    });

  return {
    filtered,
    filters,
    valuesFor,
    setFilter,
    clearAll: () => setFilters({}),
    hasActive: Object.keys(filters).length > 0,
  };
}

interface ColumnFilterProps {
  label: string;
  values: string[];
  selected: string[] | undefined;
  onChange: (selected: string[] | null) => void;
  align?: "start" | "end";
}

export function ColumnFilter({ label, values, selected, onChange, align = "start" }: ColumnFilterProps) {
  const [search, setSearch] = useState("");
  const active = selected !== undefined;
  const current = new Set(selected ?? values);
  const visible = values.filter((v) => v.toLowerCase().includes(search.trim().toLowerCase()));

  const commit = (next: Set<string>) => {
    if (values.every((v) => next.has(v))) onChange(null);
    else onChange(values.filter((v) => next.has(v)));
  };

  const toggle = (v: string) => {
    const next = new Set(current);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    commit(next);
  };

  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <span>{label}</span>
      <Popover onOpenChange={(o) => !o && setSearch("")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={active ? `Filtro ativo em ${label}` : `Filtrar ${label}`}
            aria-label={`Filtrar ${label}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded transition ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-primary"
            }`}
          >
            <Filter size={11} fill={active ? "currentColor" : "none"} />
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-64 p-2 normal-case tracking-normal font-normal">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="mb-2 flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-primary"
              onClick={() => commit(new Set([...current, ...visible]))}
            >
              Selecionar todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => {
                const next = new Set(current);
                visible.forEach((v) => next.delete(v));
                commit(next);
              }}
            >
              Limpar seleção
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {visible.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">Nenhum valor</p>
            ) : (
              visible.map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-foreground hover:bg-muted"
                >
                  <Checkbox checked={current.has(v)} onCheckedChange={() => toggle(v)} />
                  <span className={`truncate ${v === EMPTY_LABEL ? "italic text-muted-foreground" : ""}`}>{v}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}

export function ClearFiltersButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="border-primary text-primary hover:bg-accent rounded-[6px]"
    >
      <X size={14} className="mr-1" />
      Limpar todos os filtros
    </Button>
  );
}
