import { describe, expect, it } from "vitest";
import {
  chaveDoTempo,
  minutosDaCategoria,
  normalizarTempos,
  temposEfetivos,
  TEMPOS_PADRAO,
} from "./tempos";

describe("graduações acima da preta", () => {
  it("coral e vermelha lutam o tempo da preta, não o do fallback", () => {
    // são faixas-pretas graduadas: cair no fallback (azul) encurtaria a luta
    for (const faixa of ["vermelha_preta", "vermelha_branca", "vermelha"]) {
      expect(chaveDoTempo({ classeIdade: "master6", faixa })).toBe("preta");
      expect(minutosDaCategoria({ classeIdade: "master6", faixa })).toBe(
        TEMPOS_PADRAO.preta,
      );
    }
  });
});

describe("chaveDoTempo", () => {
  it("kids valem pela classe de idade (qualquer faixa da classe)", () => {
    expect(chaveDoTempo({ classeIdade: "pre_mirim", faixa: "branca" })).toBe("pre_mirim");
    expect(chaveDoTempo({ classeIdade: "mirim", faixa: "cinza" })).toBe("mirim");
    expect(chaveDoTempo({ classeIdade: "infantil", faixa: "amarela" })).toBe("infantil");
    expect(chaveDoTempo({ classeIdade: "infanto_juvenil", faixa: "verde" })).toBe(
      "infanto_juvenil",
    );
  });

  it("juvenil, adulto e masters valem pela faixa", () => {
    expect(chaveDoTempo({ classeIdade: "juvenil", faixa: "azul" })).toBe("azul");
    expect(chaveDoTempo({ classeIdade: "adulto", faixa: "preta" })).toBe("preta");
    expect(chaveDoTempo({ classeIdade: "master3", faixa: "marrom" })).toBe("marrom");
  });

  it("sem classe/faixa reconhecida cai no fallback de 6 min (azul)", () => {
    expect(chaveDoTempo({ classeIdade: null, faixa: null })).toBe("azul");
    expect(chaveDoTempo({ classeIdade: "adulto", faixa: "cinza" })).toBe("azul");
  });
});

describe("minutosDaCategoria", () => {
  it("segue a tabela padrão CBJJ sem config do evento", () => {
    expect(minutosDaCategoria({ classeIdade: "pre_mirim", faixa: "branca" })).toBe(2);
    expect(minutosDaCategoria({ classeIdade: "mirim", faixa: "branca" })).toBe(3);
    expect(minutosDaCategoria({ classeIdade: "infantil", faixa: "branca" })).toBe(4);
    expect(minutosDaCategoria({ classeIdade: "infanto_juvenil", faixa: "branca" })).toBe(4);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "branca" })).toBe(5);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "azul" })).toBe(6);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "roxa" })).toBe(7);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "marrom" })).toBe(8);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "preta" })).toBe(10);
  });

  it("a config do evento sobrescreve só a linha definida", () => {
    const tempos = { preta: 6, mirim: 2 };
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "preta" }, tempos)).toBe(6);
    expect(minutosDaCategoria({ classeIdade: "mirim", faixa: "cinza" }, tempos)).toBe(2);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "azul" }, tempos)).toBe(6);
  });

  it("ignora valor fora dos limites gravado no JSON", () => {
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "azul" }, { azul: 0 })).toBe(6);
    expect(minutosDaCategoria({ classeIdade: "adulto", faixa: "azul" }, { azul: 999 })).toBe(6);
  });
});

describe("normalizarTempos", () => {
  it("guarda só o que difere do padrão, como inteiro", () => {
    // azul "6" é o próprio padrão → não vai para o JSON; roxa arredonda p/ 8
    expect(normalizarTempos({ preta: "12", azul: "6", roxa: "8.4" })).toEqual({
      preta: 12,
      roxa: 8,
    });
  });

  it("descarta vazio, lixo, chave desconhecida e fora dos limites", () => {
    expect(
      normalizarTempos({
        preta: "",
        azul: "abc",
        juvenil: "9",
        marrom: "0",
        mirim: "999",
      }),
    ).toEqual({});
    expect(normalizarTempos(null)).toEqual({});
  });
});

describe("temposEfetivos", () => {
  it("mescla padrão + overrides para o formulário", () => {
    expect(temposEfetivos({ preta: 12 })).toEqual({ ...TEMPOS_PADRAO, preta: 12 });
    expect(temposEfetivos(null)).toEqual(TEMPOS_PADRAO);
  });
});
