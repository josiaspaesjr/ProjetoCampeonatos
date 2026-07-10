import { describe, expect, it } from "vitest";
import {
  conflitosNaLista,
  diaLocalYmd,
  diasSobrepoem,
  loteConflitante,
  ymdParaBR,
  type JanelaLote,
} from "./vigencia";

const LOTE_1: JanelaLote = { nome: "Lote 1", inicio: "2026-10-09", fim: "2026-10-20" };

describe("diasSobrepoem", () => {
  // exemplos do organizador — nenhum destes pode ser aceito
  it("início do 2º dentro do 1º (09–20 vs 10–21)", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-10-10", "2026-10-21")).toBe(true);
  });
  it("2º totalmente dentro do 1º (09–20 vs 15–19)", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-10-15", "2026-10-19")).toBe(true);
  });
  it("fim do 1º dentro do 2º (09–20 vs 15–25)", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-10-15", "2026-10-25")).toBe(true);
  });

  it("dias adjacentes NÃO se sobrepõem (fim 20 / início 21)", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-10-21", "2026-10-30")).toBe(false);
  });
  it("mesmo dia limítrofe se sobrepõe (fim 20 / início 20)", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-10-20", "2026-10-30")).toBe(true);
  });
  it("janelas totalmente separadas não se sobrepõem", () => {
    expect(diasSobrepoem("2026-10-09", "2026-10-20", "2026-11-01", "2026-11-10")).toBe(false);
  });
});

describe("loteConflitante", () => {
  it("acha o lote que colide e o devolve", () => {
    expect(loteConflitante({ inicio: "2026-10-15", fim: "2026-10-25" }, [LOTE_1])).toBe(LOTE_1);
  });
  it("null quando o candidato fica fora dos existentes", () => {
    expect(loteConflitante({ inicio: "2026-10-21", fim: "2026-10-30" }, [LOTE_1])).toBeNull();
  });
  it("null com datas incompletas", () => {
    expect(loteConflitante({ inicio: "", fim: "" }, [LOTE_1])).toBeNull();
    expect(loteConflitante({ inicio: "2026-10-15", fim: "" }, [LOTE_1])).toBeNull();
  });
  it("normaliza candidato com horário (yyyy-mm-ddThh:mm)", () => {
    expect(
      loteConflitante({ inicio: "2026-10-15T00:00:00", fim: "2026-10-25T23:59:59" }, [LOTE_1]),
    ).toBe(LOTE_1);
  });
});

describe("conflitosNaLista", () => {
  it("aponta os dois lados de uma sobreposição pelo nome do outro", () => {
    const janelas: JanelaLote[] = [
      { nome: "Lote 1", inicio: "2026-10-09", fim: "2026-10-20" },
      { nome: "Lote 2", inicio: "2026-10-15", fim: "2026-10-25" },
    ];
    expect(conflitosNaLista(janelas)).toEqual([["Lote 2"], ["Lote 1"]]);
  });

  it("não acusa conflito entre janelas separadas ou adjacentes", () => {
    const janelas: JanelaLote[] = [
      { nome: "Lote 1", inicio: "2026-10-01", fim: "2026-10-10" },
      { nome: "Lote 2", inicio: "2026-10-11", fim: "2026-10-20" },
      { nome: "Lote 3", inicio: "2026-11-01", fim: "2026-11-10" },
    ];
    expect(conflitosNaLista(janelas)).toEqual([[], [], []]);
  });

  it("um lote pode colidir com vários", () => {
    const janelas: JanelaLote[] = [
      { nome: "Guarda-chuva", inicio: "2026-10-01", fim: "2026-10-31" },
      { nome: "A", inicio: "2026-10-05", fim: "2026-10-08" },
      { nome: "B", inicio: "2026-10-20", fim: "2026-10-22" },
    ];
    expect(conflitosNaLista(janelas)).toEqual([["A", "B"], ["Guarda-chuva"], ["Guarda-chuva"]]);
  });
});

describe("diaLocalYmd", () => {
  it("extrai o dia local de uma Date âncorada em horário local", () => {
    expect(diaLocalYmd(new Date(2026, 9, 20, 23, 59, 59))).toBe("2026-10-20");
    expect(diaLocalYmd(new Date(2026, 0, 5, 0, 0, 0))).toBe("2026-01-05");
  });
});

describe("ymdParaBR", () => {
  it("formata e trata incompleto", () => {
    expect(ymdParaBR("2026-10-20")).toBe("20/10/2026");
    expect(ymdParaBR("")).toBe("—");
  });
});
