import { describe, expect, it } from "vitest";
import {
  agruparExibicao,
  classesEmOrdem,
  contarGrupos,
  corDaOnda,
  distribuirBalanceado,
  ondaDaClasse,
  ordenarCategorias,
  ordenarCategoriasExibicao,
  type CategoriaComCarga,
  type CategoriaOrdenavel,
} from "./distribuicao-areas";

type Cat = CategoriaOrdenavel & CategoriaComCarga & { id: string; lutas?: number };

/** fábrica enxuta de categorias para os testes */
function cat(
  id: string,
  classeIdade: string,
  faixa: string | null,
  sexo = "masculino",
  extra: Partial<Cat> = {},
): Cat {
  return {
    id,
    classeIdade,
    sexo,
    faixa,
    tipo: "peso",
    limitePesoKg: 70,
    carga: 300,
    ...extra,
  };
}

describe("ordenarCategoriasExibicao (ordem canônica das listas)", () => {
  it("classe de idade primeiro (ordem CBJJ, não ondas)", () => {
    const cats = ordenarCategoriasExibicao([
      cat("master7", "master7", "branca"),
      cat("adulto", "adulto", "branca"),
      cat("kid", "pre_mirim", "branca"),
    ]);
    // age order: pré-mirim → adulto → master7 (adulto NÃO vai por último aqui)
    expect(cats.map((c) => c.classeIdade)).toEqual([
      "pre_mirim",
      "adulto",
      "master7",
    ]);
  });

  it("dentro da classe, feminino antes de masculino", () => {
    const cats = ordenarCategoriasExibicao([
      cat("m", "adulto", "azul", "masculino"),
      cat("f", "adulto", "azul", "feminino"),
    ]);
    expect(cats.map((c) => c.sexo)).toEqual(["feminino", "masculino"]);
  });

  it("depois faixa (branca→preta) e por fim peso (leve→pesado)", () => {
    const cats = ordenarCategoriasExibicao([
      cat("preta", "adulto", "preta", "masculino", { limitePesoKg: 70 }),
      cat("branca-pesado", "adulto", "branca", "masculino", { limitePesoKg: 94 }),
      cat("branca-leve", "adulto", "branca", "masculino", { limitePesoKg: 64 }),
    ]);
    expect(cats.map((c) => c.id)).toEqual([
      "branca-leve",
      "branca-pesado",
      "preta",
    ]);
  });

  it("prioridade: classe > sexo > faixa > peso", () => {
    const cats = ordenarCategoriasExibicao([
      cat("adulto-m-branca", "adulto", "branca", "masculino"),
      cat("adulto-f-preta", "adulto", "preta", "feminino"),
      cat("kid-m-preta", "pre_mirim", "preta", "masculino"),
    ]);
    // pré-mirim (classe) antes de adulto; dentro do adulto, feminino antes
    expect(cats.map((c) => c.id)).toEqual([
      "kid-m-preta",
      "adulto-f-preta",
      "adulto-m-branca",
    ]);
  });
});

describe("ondaDaClasse", () => {
  it("extremos da régua CBJJ correm cedo (onda 0)", () => {
    expect(ondaDaClasse("pre_mirim")).toBe(0);
    expect(ondaDaClasse("master7")).toBe(0);
  });

  it("o miolo corre por último (onda máxima em Master 1)", () => {
    expect(ondaDaClasse("master1")).toBe(6);
    expect(ondaDaClasse("adulto")).toBe(5);
  });

  it("é simétrica em torno do centro", () => {
    expect(ondaDaClasse("mirim")).toBe(ondaDaClasse("master6")); // 1
    expect(ondaDaClasse("infantil")).toBe(ondaDaClasse("master5")); // 2
  });
});

describe("ordenarCategorias", () => {
  it("ordena a onda ascendente: extremos antes do miolo", () => {
    const cats = ordenarCategorias([
      cat("adulto", "adulto", "branca"),
      cat("kid", "pre_mirim", "branca"),
      cat("master", "master7", "branca"),
    ]);
    expect(cats.at(-1)!.classeIdade).toBe("adulto");
    expect(cats.slice(0, 2).map((c) => c.classeIdade).sort()).toEqual([
      "master7",
      "pre_mirim",
    ]);
  });

  it("dentro da mesma onda, ordena por faixa (branca→preta)", () => {
    const cats = ordenarCategorias([
      cat("p", "adulto", "preta"),
      cat("b", "adulto", "branca"),
      cat("a", "adulto", "azul"),
    ]);
    expect(cats.map((c) => c.faixa)).toEqual(["branca", "azul", "preta"]);
  });

  it("mesma onda·faixa·classe: feminino antes de masculino (ordem canônica)", () => {
    const cats = ordenarCategorias([
      cat("m", "adulto", "azul", "masculino"),
      cat("f", "adulto", "azul", "feminino"),
    ]);
    expect(cats.map((c) => c.sexo)).toEqual(["feminino", "masculino"]);
  });

  it("dentro do grupo, ordena leve→pesado→pesadíssimo→absoluto", () => {
    const cats = ordenarCategorias([
      cat("abs", "adulto", "preta", "masculino", { tipo: "absoluto", limitePesoKg: null }),
      cat("pesadissimo", "adulto", "preta", "masculino", { limitePesoKg: null }),
      cat("pesado", "adulto", "preta", "masculino", { limitePesoKg: 94 }),
      cat("leve", "adulto", "preta", "masculino", { limitePesoKg: 76 }),
    ]);
    expect(cats.map((c) => c.id)).toEqual(["leve", "pesado", "pesadissimo", "abs"]);
  });
});

describe("distribuirBalanceado", () => {
  it("preenche todas as áreas mesmo com poucos grupos (bug das áreas vazias)", () => {
    // 6 categorias de UM único grupo → 3 áreas, todas devem receber
    const grade = Array.from({ length: 6 }, (_, i) =>
      cat(`c${i}`, "adulto", "preta", "masculino", { limitePesoKg: 60 + i }),
    );
    const areas = distribuirBalanceado(grade, 3);
    expect(areas).toHaveLength(3);
    expect(areas.every((a) => a.length > 0)).toBe(true);
    expect(areas.reduce((s, a) => s + a.length, 0)).toBe(6);
  });

  it("equilibra a carga: a categoria pesada não empilha com as leves", () => {
    const grade = [
      cat("pesada", "adulto", "preta", "masculino", { carga: 3000 }),
      cat("l1", "adulto", "preta", "masculino", { carga: 300 }),
      cat("l2", "adulto", "preta", "masculino", { carga: 300 }),
      cat("l3", "adulto", "preta", "masculino", { carga: 300 }),
    ];
    const [a0, a1] = distribuirBalanceado(grade, 2);
    // a área que pegou a categoria pesada recebe menos categorias no total
    const cargaDe = (a: typeof grade) => a.reduce((s, c) => s + c.carga, 0);
    expect(Math.abs(cargaDe(a0) - cargaDe(a1))).toBeLessThan(3000);
  });

  it("cada área preserva a ordem do dia recebida", () => {
    const grade = ordenarCategorias([
      cat("k", "pre_mirim", "branca"),
      cat("m", "master1", "preta"),
      cat("ad1", "adulto", "azul"),
      cat("ad2", "adulto", "preta"),
    ]);
    for (const area of distribuirBalanceado(grade, 2)) {
      const ondas = area.map((c) => ondaDaClasse(c.classeIdade));
      expect(ondas).toEqual([...ondas].sort((a, b) => a - b));
    }
  });

  it("nunca gera menos de uma área", () => {
    expect(distribuirBalanceado([cat("a", "adulto", "preta")], 0)).toHaveLength(1);
  });
});

describe("agruparExibicao", () => {
  it("reagrupa por classe·sexo·faixa contando os pesos", () => {
    const grupos = agruparExibicao([
      cat("a", "adulto", "preta"),
      cat("b", "adulto", "preta"),
      cat("c", "adulto", "azul"),
    ]);
    expect(grupos.find((g) => g.faixa === "preta")!.pesos).toBe(2);
    expect(grupos.find((g) => g.faixa === "azul")!.pesos).toBe(1);
  });
});

describe("classesEmOrdem / contarGrupos", () => {
  it("lista as classes distintas na ordem recebida", () => {
    const cats = ordenarCategorias([
      cat("a", "adulto", "preta"),
      cat("k", "pre_mirim", "branca"),
    ]);
    expect(classesEmOrdem(cats).map((c) => c.nome)).toEqual([
      "Pré-Mirim",
      "Adulto",
    ]);
  });

  it("conta os grupos distintos da grade", () => {
    expect(
      contarGrupos([
        cat("a", "adulto", "preta"),
        cat("b", "adulto", "preta"),
        cat("c", "adulto", "azul", "feminino"),
      ]),
    ).toBe(2);
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
