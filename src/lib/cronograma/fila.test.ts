import { describe, expect, it } from "vitest";
import { duracaoDaCategoria, duracaoLutaSegundos, TRANSICAO_SEGUNDOS } from "./fila";

describe("duracaoDaCategoria", () => {
  it("usa o valor configurado da categoria quando presente", () => {
    expect(
      duracaoDaCategoria({
        classeIdade: "adulto",
        faixa: "preta",
        duracaoLutaSegundos: 240,
      }),
    ).toBe(240);
  });

  it("cai na tabela do evento/CBJJ quando a categoria não tem valor próprio", () => {
    const preta = { classeIdade: "adulto", faixa: "preta" };
    expect(duracaoDaCategoria({ ...preta, duracaoLutaSegundos: null })).toBe(
      duracaoLutaSegundos(preta),
    );
    expect(duracaoLutaSegundos(preta)).toBe(10 * 60 + TRANSICAO_SEGUNDOS);

    const semFaixa = { classeIdade: null, faixa: null };
    expect(duracaoDaCategoria({ ...semFaixa, duracaoLutaSegundos: null })).toBe(
      duracaoLutaSegundos(semFaixa),
    );
  });

  it("respeita a tabela de tempos do evento", () => {
    const azul = { classeIdade: "adulto", faixa: "azul", duracaoLutaSegundos: null };
    expect(duracaoDaCategoria(azul, { azul: 4 })).toBe(4 * 60 + TRANSICAO_SEGUNDOS);
    // o valor próprio da categoria continua vencendo a tabela do evento
    expect(
      duracaoDaCategoria({ ...azul, duracaoLutaSegundos: 300 }, { azul: 4 }),
    ).toBe(300);
  });

  it("kids valem pela classe de idade, não pela faixa", () => {
    const mirimBranca = {
      classeIdade: "mirim",
      faixa: "branca",
      duracaoLutaSegundos: null,
    };
    const adultoBranca = {
      classeIdade: "adulto",
      faixa: "branca",
      duracaoLutaSegundos: null,
    };
    expect(duracaoDaCategoria(mirimBranca)).toBe(3 * 60 + TRANSICAO_SEGUNDOS);
    expect(duracaoDaCategoria(adultoBranca)).toBe(5 * 60 + TRANSICAO_SEGUNDOS);
  });
});

// a intercalação por descanso vive agora em ./intercalar.ts — ver intercalar.test.ts.
