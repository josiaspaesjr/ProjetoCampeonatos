import { describe, expect, it } from "vitest";
import {
  absolutoDaCategoria,
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "./elegibilidade";

describe("idadeNoAnoDoEvento", () => {
  it("usa a idade que o atleta completa no ano do evento", () => {
    // faz 30 em dezembro, mas o evento é em março: já conta como 30
    expect(idadeNoAnoDoEvento("1996-12-20", "2026-03-14")).toBe(30);
    expect(idadeNoAnoDoEvento("1996-01-02", "2026-03-14")).toBe(30);
  });
});

describe("categoriaCompativel", () => {
  const adultoPreta = {
    sexo: "masculino",
    faixa: "preta",
    classeIdade: "adulto",
    idadeMin: 18,
    idadeMax: null,
  };

  it("exige mesmo sexo e mesma faixa", () => {
    const atleta = { sexo: "masculino", faixa: "preta", idade: 30 };
    expect(categoriaCompativel(adultoPreta, atleta)).toBe(true);
    expect(
      categoriaCompativel(adultoPreta, { ...atleta, sexo: "feminino" }),
    ).toBe(false);
    expect(categoriaCompativel(adultoPreta, { ...atleta, faixa: "roxa" })).toBe(
      false,
    );
  });

  it("categoria sem faixa aceita qualquer uma", () => {
    const custom = {
      sexo: "masculino",
      faixa: null,
      classeIdade: "adulto",
      idadeMin: null,
      idadeMax: null,
    };
    expect(
      categoriaCompativel(custom, { sexo: "masculino", faixa: "azul", idade: 25 }),
    ).toBe(true);
  });

  const masterPreta = (n: number, min: number, max: number) => ({
    sexo: "masculino",
    faixa: "preta",
    classeIdade: `master${n}`,
    idadeMin: min,
    idadeMax: max,
  });
  const M1 = masterPreta(1, 30, 35);
  const M2 = masterPreta(2, 36, 40);
  const M3 = masterPreta(3, 41, 45);
  const M4 = masterPreta(4, 46, 50);

  it("master desce por TODAS as divisões adultas abaixo da dele", () => {
    // um master 3 pode lutar master 3, 2, 1 ou adulto
    const m3 = { sexo: "masculino", faixa: "preta", idade: 43 };
    expect(categoriaCompativel(M3, m3)).toBe(true);
    expect(categoriaCompativel(M2, m3)).toBe(true);
    expect(categoriaCompativel(M1, m3)).toBe(true);
    expect(categoriaCompativel(adultoPreta, m3)).toBe(true);
  });

  it("mas não sobe: o piso de idade continua eliminando", () => {
    const m3 = { sexo: "masculino", faixa: "preta", idade: 43 };
    expect(categoriaCompativel(M4, m3)).toBe(false);

    const adulto = { sexo: "masculino", faixa: "preta", idade: 25 };
    expect(categoriaCompativel(M1, adulto)).toBe(false);
    expect(categoriaCompativel(adultoPreta, adulto)).toBe(true);
  });

  it("kids e juvenil mantêm o teto: adulto não desce para eles", () => {
    const juvenil = {
      sexo: "masculino",
      faixa: "azul",
      classeIdade: "juvenil",
      idadeMin: 16,
      idadeMax: 17,
    };
    const adulto = { sexo: "masculino", faixa: "azul", idade: 25 };
    expect(categoriaCompativel(juvenil, adulto)).toBe(false);
  });
});

describe("absolutoDaCategoria", () => {
  const adulto = { id: "abs-adulto", classeIdade: "adulto" };
  const master1 = { id: "abs-master1", classeIdade: "master1" };

  it("segue a classe da categoria de peso escolhida", () => {
    expect(absolutoDaCategoria([adulto, master1], "master1")).toBe(master1);
    expect(absolutoDaCategoria([adulto, master1], "adulto")).toBe(adulto);
  });

  it("sem absoluto da classe, devolve o primeiro compatível", () => {
    // atleta pediu absoluto: dar algum é melhor do que engolir o pedido
    expect(absolutoDaCategoria([adulto], "master1")).toBe(adulto);
  });

  it("sem nenhum absoluto compatível, devolve null", () => {
    expect(absolutoDaCategoria([], "adulto")).toBeNull();
  });
});
