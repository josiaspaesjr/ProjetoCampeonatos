import { describe, expect, it } from "vitest";
import {
  agruparEOrdenar,
  corDaOnda,
  distribuirEmAreas,
  ondaDaClasse,
  type CategoriaParaAgrupar,
} from "./distribuicao-areas";

/** fábrica enxuta de categorias para os testes */
function cat(
  id: string,
  classeIdade: string,
  faixa: string | null,
  sexo = "masculino",
  extra: Partial<CategoriaParaAgrupar> = {},
): CategoriaParaAgrupar {
  return { id, classeIdade, sexo, faixa, tipo: "peso", limitePesoKg: 70, ...extra };
}

describe("ondaDaClasse", () => {
  it("extremos da régua CBJJ correm cedo (onda 0)", () => {
    expect(ondaDaClasse("pre_mirim")).toBe(0);
    expect(ondaDaClasse("master7")).toBe(0);
  });

  it("o miolo corre por último (onda máxima em Master 1)", () => {
    expect(ondaDaClasse("master1")).toBe(6);
    // Adulto fica logo antes do centro
    expect(ondaDaClasse("adulto")).toBe(5);
  });

  it("é simétrica em torno do centro", () => {
    expect(ondaDaClasse("mirim")).toBe(ondaDaClasse("master6")); // 1
    expect(ondaDaClasse("infantil")).toBe(ondaDaClasse("master5")); // 2
  });
});

describe("agruparEOrdenar", () => {
  it("agrupa por classe·sexo·faixa e conta os pesos", () => {
    const grupos = agruparEOrdenar([
      cat("a", "adulto", "preta"),
      cat("b", "adulto", "preta"),
      cat("c", "adulto", "azul"),
    ]);
    const preta = grupos.find((g) => g.faixa === "preta")!;
    expect(preta.pesos).toBe(2);
    expect(preta.categoriaIds).toEqual(["a", "b"]);
    expect(grupos.find((g) => g.faixa === "azul")!.pesos).toBe(1);
  });

  it("ordena a onda ascendente: extremos antes do miolo", () => {
    const grupos = agruparEOrdenar([
      cat("adulto", "adulto", "branca"),
      cat("kid", "pre_mirim", "branca"),
      cat("master", "master7", "branca"),
    ]);
    // pre_mirim e master7 (onda 0) vêm antes de adulto (onda 5)
    expect(grupos.at(-1)!.classeId).toBe("adulto");
    expect(grupos.slice(0, 2).map((g) => g.classeId).sort()).toEqual([
      "master7",
      "pre_mirim",
    ]);
  });

  it("dentro da mesma onda, ordena por faixa (branca→preta)", () => {
    const grupos = agruparEOrdenar([
      cat("p", "adulto", "preta"),
      cat("b", "adulto", "branca"),
      cat("a", "adulto", "azul"),
    ]);
    expect(grupos.map((g) => g.faixa)).toEqual(["branca", "azul", "preta"]);
  });

  it("absoluto e pesadíssimo (sem limite) vão ao fim do grupo", () => {
    const grupos = agruparEOrdenar([
      cat("abs", "adulto", "preta", "masculino", { tipo: "absoluto", limitePesoKg: null }),
      cat("pesadissimo", "adulto", "preta", "masculino", { limitePesoKg: null }),
      cat("leve", "adulto", "preta", "masculino", { limitePesoKg: 76 }),
    ]);
    expect(grupos[0].categoriaIds).toEqual(["leve", "pesadissimo", "abs"]);
  });
});

describe("distribuirEmAreas", () => {
  it("faz round-robin dos grupos nas N áreas", () => {
    const areas = distribuirEmAreas(["g0", "g1", "g2", "g3", "g4"], 2);
    expect(areas).toEqual([["g0", "g2", "g4"], ["g1", "g3"]]);
  });

  it("toda área começa pelo mesmo início da ordem (extremos)", () => {
    const grupos = agruparEOrdenar([
      cat("k1", "pre_mirim", "branca"),
      cat("k2", "mirim", "branca"),
      cat("ad", "adulto", "preta"),
      cat("m1", "master1", "preta"),
    ]);
    const [area0, area1] = distribuirEmAreas(grupos, 2);
    // grupo de menor onda cai na área 0; o segundo menor na área 1
    expect(area0[0].onda).toBeLessThanOrEqual(area1[0]?.onda ?? Infinity);
  });

  it("nunca gera menos de uma área", () => {
    expect(distribuirEmAreas(["a"], 0)).toHaveLength(1);
  });
});

describe("corDaOnda", () => {
  it("extremo (onda 0) é o vermelho cheio", () => {
    expect(corDaOnda(0, 6)).toBe("rgba(238,46,36,1.000)");
  });

  it("centro apaga até o piso de 0,22", () => {
    expect(corDaOnda(6, 6)).toBe("rgba(238,46,36,0.220)");
  });
});
