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
    const custom = { sexo: "masculino", faixa: null, idadeMin: null, idadeMax: null };
    expect(
      categoriaCompativel(custom, { sexo: "masculino", faixa: "azul", idade: 25 }),
    ).toBe(true);
  });

  it("master pode descer para o adulto, mas o adulto não sobe", () => {
    const master1 = { sexo: "masculino", faixa: "preta", idadeMin: 30, idadeMax: 35 };
    const master = { sexo: "masculino", faixa: "preta", idade: 32 };
    expect(categoriaCompativel(adultoPreta, master)).toBe(true);
    expect(categoriaCompativel(master1, master)).toBe(true);

    const adulto = { sexo: "masculino", faixa: "preta", idade: 25 };
    expect(categoriaCompativel(master1, adulto)).toBe(false);
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
