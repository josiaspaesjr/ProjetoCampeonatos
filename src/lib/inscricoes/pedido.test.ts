import { describe, expect, it } from "vitest";
import { montarPedido, type CategoriaDoPedido, type LoteDoPedido } from "./pedido";

const LOTE: LoteDoPedido = {
  precoCentavos: 10000,
  precoSegundaInscricaoCentavos: 5000,
  variacoes: [{ nome: "Adulto", precoCentavos: 13000 }],
};

const peso: CategoriaDoPedido = {
  id: "peso",
  nome: "Adulto / Masculino / Azul / Leve",
  precoCentavos: null,
  grupoPreco: null,
};
const absoluto: CategoriaDoPedido = {
  id: "abs",
  nome: "Adulto / Masculino / Azul / Absoluto",
  precoCentavos: null,
  grupoPreco: null,
};

describe("montarPedido", () => {
  it("sem absoluto, gera só a categoria de peso pelo preço cheio", () => {
    const itens = montarPedido({
      categoria: peso,
      absoluto: null,
      lote: LOTE,
      jaTemInscricao: false,
    });
    expect(itens).toEqual([{ categoria: peso, valorCentavos: 10000 }]);
  });

  it("com absoluto, ele sai pelo preço de 2ª inscrição do lote", () => {
    const itens = montarPedido({
      categoria: peso,
      absoluto,
      lote: LOTE,
      jaTemInscricao: false,
    });
    expect(itens.map((i) => i.valorCentavos)).toEqual([10000, 5000]);
    expect(itens.map((i) => i.categoria.id)).toEqual(["peso", "abs"]);
  });

  it("quem já tinha inscrição paga 2ª nas duas", () => {
    const itens = montarPedido({
      categoria: peso,
      absoluto,
      lote: LOTE,
      jaTemInscricao: true,
    });
    expect(itens.map((i) => i.valorCentavos)).toEqual([5000, 5000]);
  });

  it("o grupo de preço vale na de peso, mas o absoluto continua na de 2ª", () => {
    const itens = montarPedido({
      categoria: { ...peso, grupoPreco: "Adulto" },
      absoluto: { ...absoluto, grupoPreco: "Adulto" },
      lote: LOTE,
      jaTemInscricao: false,
    });
    expect(itens.map((i) => i.valorCentavos)).toEqual([13000, 5000]);
  });

  it("preço próprio da categoria (entry) vence o desconto de 2ª", () => {
    const itens = montarPedido({
      categoria: peso,
      absoluto: { ...absoluto, precoCentavos: 20000 },
      lote: LOTE,
      jaTemInscricao: false,
    });
    expect(itens.map((i) => i.valorCentavos)).toEqual([10000, 20000]);
  });

  it("lote sem preço de 2ª: o absoluto cai no preço base", () => {
    const itens = montarPedido({
      categoria: peso,
      absoluto,
      lote: { ...LOTE, precoSegundaInscricaoCentavos: null },
      jaTemInscricao: false,
    });
    expect(itens.map((i) => i.valorCentavos)).toEqual([10000, 10000]);
  });
});
