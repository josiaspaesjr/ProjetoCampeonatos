import { describe, expect, it } from "vitest";
import {
  hhmmParaMinutos,
  minutosParaHHMM,
  normalizarDias,
  type DiaRow,
} from "./dias";

describe("hhmm ⇄ minutos", () => {
  it("converte HH:MM para minutos", () => {
    expect(hhmmParaMinutos("09:00")).toBe(540);
    expect(hhmmParaMinutos("18:30")).toBe(1110);
    expect(hhmmParaMinutos("00:00")).toBe(0);
  });

  it("entrada inválida vira 0", () => {
    expect(hhmmParaMinutos("")).toBe(0);
    expect(hhmmParaMinutos("abc")).toBe(0);
  });

  it("minutos para HH:MM", () => {
    expect(minutosParaHHMM(540)).toBe("09:00");
    expect(minutosParaHHMM(1110)).toBe("18:30");
    expect(minutosParaHHMM(0)).toBe("00:00");
  });
});

describe("normalizarDias", () => {
  it("sem dias configurados devolve um dia aberto na data de início (09:00–23:59)", () => {
    const janelas = normalizarDias([], { dataInicio: "2026-03-14" });
    expect(janelas).toEqual([
      { data: "2026-03-14", inicioSegundos: 9 * 3600, fimSegundos: (23 * 60 + 59) * 60 },
    ]);
  });

  it("ordena por data e converte minutos → segundos", () => {
    const rows: DiaRow[] = [
      { data: "2026-03-15", inicioMinutos: 540, fimMinutos: 1080, ordem: 1 },
      { data: "2026-03-14", inicioMinutos: 600, fimMinutos: 1140, ordem: 0 },
    ];
    const janelas = normalizarDias(rows, { dataInicio: "2026-03-14" });
    expect(janelas).toEqual([
      { data: "2026-03-14", inicioSegundos: 600 * 60, fimSegundos: 1140 * 60 },
      { data: "2026-03-15", inicioSegundos: 540 * 60, fimSegundos: 1080 * 60 },
    ]);
  });
});
