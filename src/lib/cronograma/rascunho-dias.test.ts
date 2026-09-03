import { describe, expect, it } from "vitest";
import {
  diasDistintosDoRascunho,
  janelasDoRascunho,
} from "./rascunho-dias";

const dia = (data: string, inicio: string, fim: string) => ({
  data,
  inicio,
  fim,
});

describe("janelasDoRascunho", () => {
  it("converte HH:MM em segundos desde a meia-noite", () => {
    expect(janelasDoRascunho([dia("2026-10-24", "09:00", "18:00")])).toEqual([
      { data: "2026-10-24", inicioSegundos: 32400, fimSegundos: 64800 },
    ]);
  });

  it("ordena por data e, no mesmo dia, manhã antes de tarde", () => {
    const r = janelasDoRascunho([
      dia("2026-10-25", "09:00", "12:00"),
      dia("2026-10-24", "14:00", "18:00"),
      dia("2026-10-24", "09:00", "12:00"),
    ]);
    expect(r.map((j) => [j.data, j.inicioSegundos / 3600])).toEqual([
      ["2026-10-24", 9],
      ["2026-10-24", 14],
      ["2026-10-25", 9],
    ]);
  });

  it("descarta a linha do dia recém-adicionado, ainda sem data", () => {
    expect(janelasDoRascunho([dia("", "09:00", "18:00")])).toEqual([]);
  });

  it("horário torto vira meia-noite em vez de NaN", () => {
    const [j] = janelasDoRascunho([dia("2026-10-24", "", "18:00")]);
    expect(j.inicioSegundos).toBe(0);
  });
});

describe("diasDistintosDoRascunho", () => {
  it("um dia com manhã e tarde conta uma vez só", () => {
    expect(
      diasDistintosDoRascunho([
        dia("2026-10-24", "09:00", "12:00"),
        dia("2026-10-24", "14:00", "18:00"),
      ]),
    ).toEqual([{ data: "2026-10-24", label: "24/10" }]);
  });

  it("ordena por data e rotula em dd/mm", () => {
    expect(
      diasDistintosDoRascunho([
        dia("2026-11-02", "09:00", "18:00"),
        dia("2026-10-24", "09:00", "18:00"),
      ]).map((d) => d.label),
    ).toEqual(["24/10", "02/11"]);
  });

  it("ignora o dia em branco (recém-adicionado)", () => {
    expect(diasDistintosDoRascunho([dia("", "09:00", "18:00")])).toEqual([]);
  });
});
