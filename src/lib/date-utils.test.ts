import { describe, it, expect } from "vitest";
import { formatDateBR, detectColumnFormat, resolveSheetDate, compareDateDesc, latestRealDate, splitIndicacoes } from "./date-utils";

const T = "2026-10-30";
describe("date-utils", () => {
  it("formats without timezone shift", () => {
    expect(formatDateBR("2026-10-29")).toBe("29/10/2026");
    expect(formatDateBR("1900-01-01")).toBe("—");
    expect(formatDateBR(null)).toBe("—");
  });
  it("detects column format", () => {
    expect(detectColumnFormat(["10/14/2026", "10/07/2026"])).toBe("MDY");
    expect(detectColumnFormat(["14/10/2026"])).toBe("DMY");
    expect(detectColumnFormat(["14/10/2026", "10/14/2026"])).toBe("MIXED");
  });
  it("resolves ambiguous values by column format", () => {
    expect(resolveSheetDate("10/07/2026", "MDY", "action", undefined, T).iso).toBe("2026-10-07");
    expect(resolveSheetDate("10/07/2026", "NONE", "action", undefined, T).iso).toBe("2026-07-10");
  });
  it("swaps implausible future dates", () => {
    const r = resolveSheetDate(new Date(Date.UTC(2026, 11, 10)), "NONE", "action", undefined, T);
    expect(r).toEqual({ iso: "2026-10-12", corrected: true, invalid: false });
  });
  it("marks impossible dates invalid", () => {
    expect(resolveSheetDate("29/20/2026", "NONE", "action", undefined, T).invalid).toBe(true);
    expect(resolveSheetDate("12/12/2020", "NONE", "action", undefined, T).invalid).toBe(true);
  });
  it("retorno allows up to +60 days", () => {
    expect(resolveSheetDate("15/12/2026", "DMY", "retorno", undefined, T).iso).toBe("2026-12-15");
  });
  it("sorts undated last and ignores future in latest", () => {
    expect(["1900-01-01", "2026-01-02", "2026-05-01"].sort(compareDateDesc)).toEqual(["2026-05-01", "2026-01-02", "1900-01-01"]);
    expect(latestRealDate(["2026-12-01", "2026-10-01", "1900-01-01"], T)).toBe("2026-10-01");
  });
  it("excludes Distribuição rows", () => {
    const r = splitIndicacoes([{ jobhunter: "Distribuição", data_acao: "2026-01-05" }, { jobhunter: "Ana", data_acao: "2026-02-01" }]);
    expect(r.indicacoes).toHaveLength(1);
    expect(r.distribuidoEm).toBe("2026-01-05");
  });
});
