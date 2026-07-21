import { describe, expect, it } from "vitest";
import { intercalarComDescanso, type UnidadeIntercalavel } from "./intercalar";

/**
 * Intercalação por descanso. `intercalarComDescanso` mantém a ordem-base
 * (categoria a categoria, ordem da chave dentro de cada) e só insere um separador
 * antes de uma luta "A definir" que emendaria — garantindo que toda indefinida
 * venha após uma definida de OUTRA categoria (atletas distintos → descanso).
 */

type U = UnidadeIntercalavel & { id: string };

/** cria uma unidade: def = round 1/pronta (separa) · indef = "A definir" (precisa
 *  descanso) · inerte = estimada (categoria sem chave: nem separa nem é separada) */
function u(
  id: string,
  catId: string,
  tipo: "def" | "indef" | "inerte",
  dataFixada: string | null = null,
): U {
  return {
    id,
    catId,
    dataFixada,
    indefinida: tipo === "indef",
    separadora: tipo === "def",
  };
}

const ids = (arr: U[]) => arr.map((x) => x.id);

describe("intercalarComDescanso", () => {
  it("categoria sozinha: a final emenda (sem outra categoria não há descanso)", () => {
    // chave de 3: L1 def (A×B → V), L2 indef (V × C). Nada para intercalar.
    expect(ids(intercalarComDescanso([u("g1", "G", "def"), u("g2", "G", "indef")]))).toEqual(
      ["g1", "g2"],
    );
  });

  it("chave de 3 + outra categoria: a definida da outra separa a final", () => {
    // A: a0 def, a1 indef · B: b0 def → a1 entra depois de b0 (B ≠ A)
    const out = intercalarComDescanso([
      u("a0", "A", "def"),
      u("a1", "A", "indef"),
      u("b0", "B", "def"),
    ]);
    expect(ids(out)).toEqual(["a0", "b0", "a1"]);
  });

  it("cenário do print: cada A definir vem após uma definida de outra categoria", () => {
    // GALO (2), MEIO-PESADO (chave de 8), PENA e SUPER-PESADO — igual às imagens
    const base = [
      u("G1", "G", "def"),
      u("G2", "G", "indef"),
      u("M1", "M", "def"),
      u("M2", "M", "def"),
      u("M3", "M", "def"),
      u("M4", "M", "def"),
      u("M5", "M", "indef"),
      u("M6", "M", "indef"),
      u("M7", "M", "indef"),
      u("P1", "P", "def"),
      u("P2", "P", "def"),
      u("P3", "P", "def"),
      u("P4", "P", "indef"),
      u("P5", "P", "indef"),
      u("S1", "S", "def"),
      u("S2", "S", "def"),
      u("S3", "S", "def"),
    ];
    expect(ids(intercalarComDescanso(base))).toEqual([
      "G1", "M1", "G2", "M2", "M3", "M4", "P1", "M5", "P2", "M6", "P3", "M7",
      "S1", "P4", "S2", "P5", "S3",
    ]);
  });

  it("nenhuma indefinida cai logo após uma luta da própria categoria (invariante)", () => {
    const base = [
      u("a0", "A", "def"),
      u("a1", "A", "def"),
      u("a2", "A", "indef"),
      u("a3", "A", "indef"),
      u("b0", "B", "def"),
      u("b1", "B", "def"),
      u("c0", "C", "def"),
    ];
    const out = intercalarComDescanso(base);
    for (let i = 1; i < out.length; i++) {
      if (out[i].indefinida) {
        // a anterior é uma separadora de OUTRA categoria
        expect(out[i - 1].separadora).toBe(true);
        expect(out[i - 1].catId).not.toBe(out[i].catId);
      }
    }
  });

  it("respeita os dias: não mistura dataFixada diferentes (intercala dentro de cada)", () => {
    const out = intercalarComDescanso([
      u("A1", "A", "def", "2026-05-10"),
      u("A2", "A", "indef", "2026-05-10"),
      u("B1", "B", "def", "2026-05-10"),
      u("C1", "C", "def", "2026-05-11"),
      u("C2", "C", "indef", "2026-05-11"),
      u("D1", "D", "def", "2026-05-11"),
    ]);
    // dia 1 (A,B) inteiro antes do dia 2 (C,D); dentro de cada dia, intercala
    expect(ids(out)).toEqual(["A1", "B1", "A2", "C1", "D1", "C2"]);
  });

  it("tudo definido (sem A definir): mantém a ordem-base", () => {
    const out = intercalarComDescanso([
      u("a", "A", "def"),
      u("b", "A", "def"),
      u("c", "B", "def"),
    ]);
    expect(ids(out)).toEqual(["a", "b", "c"]);
  });

  it("unidades inertes (categoria sem chave) não separam nem são separadas", () => {
    // A = chave de 3 (a0 def, a1 indef) · B sem chave (estimadas, inertes)
    const out = intercalarComDescanso([
      u("a0", "A", "def"),
      u("a1", "A", "indef"),
      u("b0", "B", "inerte"),
      u("b1", "B", "inerte"),
    ]);
    // b0 é inerte → não serve de separador; a1 emenda (inevitável) e B fica compacta
    expect(ids(out)).toEqual(["a0", "a1", "b0", "b1"]);
  });

  it("lida com lista vazia", () => {
    expect(intercalarComDescanso([])).toEqual([]);
  });
});
