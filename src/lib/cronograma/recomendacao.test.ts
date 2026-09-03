import { describe, expect, it } from "vitest";
import { situacaoRecomendacao } from "./recomendacao";

const cenario = (
  ideal: number | null,
  atual: number | null,
  lutasPrevistas = 10,
) => ({ ideal, atual, lutasPrevistas });

describe("situacaoRecomendacao", () => {
  it("sem luta estimada não recomenda número nenhum", () => {
    // 1 tatame "cabe" quando a demanda é zero — dizer isso enganaria o
    // organizador antes das inscrições confirmadas
    expect(situacaoRecomendacao(cenario(1, 2, 0))).toBe("semDados");
  });

  it("nem o teto de tatames resolvendo vira alerta de tempo", () => {
    expect(situacaoRecomendacao(cenario(null, 3))).toBe("impossivel");
  });

  it("sem tatame planejado ainda, orienta por onde começar", () => {
    expect(situacaoRecomendacao(cenario(3, null))).toBe("comece");
  });

  it("planejado abaixo do ideal: faltam tatames", () => {
    expect(situacaoRecomendacao(cenario(3, 2))).toBe("faltam");
  });

  it("planejado acima do ideal: sobra folga", () => {
    expect(situacaoRecomendacao(cenario(1, 2))).toBe("sobram");
  });

  it("planejado igual ao ideal: bate", () => {
    expect(situacaoRecomendacao(cenario(2, 2))).toBe("bate");
  });

  it("'sem dados' vence os demais casos", () => {
    // sem lutas, nem a ausência de ideal muda o recado
    expect(situacaoRecomendacao(cenario(null, null, 0))).toBe("semDados");
  });
});
