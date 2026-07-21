import { describe, expect, it } from "vitest";
import { duracaoDaCategoria, duracaoLutaSegundos } from "./fila";

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

// a intercalação por descanso (antiga intercalarPorRodada) foi para
// ./intercalar.ts — ver intercalar.test.ts.
