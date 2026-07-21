import { describe, expect, it } from "vitest";
import {
  duracaoDaCategoria,
  duracaoLutaSegundos,
  intercalarPorRodada,
} from "./fila";

describe("duracaoDaCategoria", () => {
  it("usa o valor configurado quando presente", () => {
    expect(duracaoDaCategoria({ faixa: "preta", duracaoLutaSegundos: 240 })).toBe(240);
  });

  it("cai na tabela CBJJ da faixa quando nulo", () => {
    expect(duracaoDaCategoria({ faixa: "preta", duracaoLutaSegundos: null })).toBe(
      duracaoLutaSegundos("preta"),
    );
    expect(duracaoDaCategoria({ faixa: null, duracaoLutaSegundos: null })).toBe(
      duracaoLutaSegundos(null),
    );
  });
});

describe("intercalarPorRodada", () => {
  it("alterna as rodadas das categorias (1ª de todas, depois a 2ª…)", () => {
    const a = [["a-r1"], ["a-r2"], ["a-r3"]];
    const b = [["b-r1"], ["b-r2"]];
    expect(intercalarPorRodada([a, b])).toEqual([
      "a-r1",
      "b-r1",
      "a-r2",
      "b-r2",
      "a-r3",
    ]);
  });

  it("mantém as lutas de uma mesma rodada juntas", () => {
    const a = [["a-r1p0", "a-r1p1"], ["a-r2p0"]];
    const b = [["b-r1p0"]];
    expect(intercalarPorRodada([a, b])).toEqual([
      "a-r1p0",
      "a-r1p1",
      "b-r1p0",
      "a-r2p0",
    ]);
  });

  it("lida com listas vazias", () => {
    expect(intercalarPorRodada([])).toEqual([]);
    expect(intercalarPorRodada([[], [["x"]]])).toEqual(["x"]);
  });
});
