import { describe, expect, it } from "vitest";
import {
  gruposDePreco,
  precoDoGrupoCentavos,
  precoInscricaoCentavos,
  type LoteVariacao,
} from "./preco";

// exemplo do organizador: kids 100 / senior 110 / adulto 130 / feminino 40
const VARIACOES: LoteVariacao[] = [
  { nome: "kids", precoCentavos: 10000 },
  { nome: "senior", precoCentavos: 11000 },
  { nome: "adulto", precoCentavos: 13000 },
  { nome: "feminino", precoCentavos: 4000 },
];

const BASE = 7000;
const SEGUNDA = 5000;

/** monta os args de precoInscricaoCentavos com defaults do lote de exemplo */
function args(over: Partial<Parameters<typeof precoInscricaoCentavos>[0]> = {}) {
  return {
    categoriaPrecoCentavos: null,
    grupoPreco: null,
    loteVariacoes: VARIACOES,
    lotePrecoCentavos: BASE,
    lotePrecoSegundaCentavos: SEGUNDA,
    ehSegundaInscricao: false,
    ...over,
  };
}

describe("precoDoGrupoCentavos", () => {
  it("acha o preço da variação pelo nome do grupo", () => {
    expect(precoDoGrupoCentavos(VARIACOES, "adulto")).toBe(13000);
    expect(precoDoGrupoCentavos(VARIACOES, "feminino")).toBe(4000);
  });

  it("retorna null quando o grupo não existe no lote", () => {
    expect(precoDoGrupoCentavos(VARIACOES, "master")).toBeNull();
  });

  it("retorna null sem grupo ou sem variações", () => {
    expect(precoDoGrupoCentavos(VARIACOES, null)).toBeNull();
    expect(precoDoGrupoCentavos(null, "adulto")).toBeNull();
    expect(precoDoGrupoCentavos([], "adulto")).toBeNull();
  });
});

describe("precoInscricaoCentavos — precedência", () => {
  it("1) preço próprio da categoria vence tudo", () => {
    expect(
      precoInscricaoCentavos(
        args({ categoriaPrecoCentavos: 20000, grupoPreco: "adulto" }),
      ),
    ).toBe(20000);
  });

  it("2) preço do grupo da categoria", () => {
    expect(precoInscricaoCentavos(args({ grupoPreco: "adulto" }))).toBe(13000);
    expect(precoInscricaoCentavos(args({ grupoPreco: "kids" }))).toBe(10000);
  });

  it("2 vence 3) grupo manda mesmo na 2ª inscrição", () => {
    expect(
      precoInscricaoCentavos(
        args({ grupoPreco: "feminino", ehSegundaInscricao: true }),
      ),
    ).toBe(4000);
  });

  it("3) desconto de 2ª inscrição quando não há grupo", () => {
    expect(precoInscricaoCentavos(args({ ehSegundaInscricao: true }))).toBe(
      SEGUNDA,
    );
  });

  it("4) preço base quando não há grupo nem 2ª inscrição", () => {
    expect(precoInscricaoCentavos(args())).toBe(BASE);
  });

  it("grupo inexistente no lote cai no fallback (base / 2ª)", () => {
    expect(precoInscricaoCentavos(args({ grupoPreco: "master" }))).toBe(BASE);
    expect(
      precoInscricaoCentavos(
        args({ grupoPreco: "master", ehSegundaInscricao: true }),
      ),
    ).toBe(SEGUNDA);
  });

  it("sem preço de 2ª definido, a 2ª inscrição usa o base", () => {
    expect(
      precoInscricaoCentavos(
        args({ ehSegundaInscricao: true, lotePrecoSegundaCentavos: null }),
      ),
    ).toBe(BASE);
  });
});

describe("gruposDePreco", () => {
  it("une os nomes das variações de todos os lotes, sem repetir", () => {
    const lotes = [
      { variacoes: VARIACOES },
      { variacoes: [{ nome: "adulto", precoCentavos: 15000 }] },
      { variacoes: null },
    ];
    expect(gruposDePreco(lotes)).toEqual([
      "kids",
      "senior",
      "adulto",
      "feminino",
    ]);
  });

  it("ignora nomes vazios/em branco", () => {
    const lotes = [
      { variacoes: [{ nome: "  ", precoCentavos: 100 }, { nome: "kids", precoCentavos: 100 }] },
    ];
    expect(gruposDePreco(lotes)).toEqual(["kids"]);
  });

  it("sem variações, retorna lista vazia", () => {
    expect(gruposDePreco([{ variacoes: null }, { variacoes: [] }])).toEqual([]);
  });
});
