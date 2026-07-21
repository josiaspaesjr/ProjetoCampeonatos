import { describe, expect, it } from "vitest";
import {
  agruparEmCamadas,
  intercalarCategorias,
  intercalarComDescanso,
  type LutaEmCamada,
} from "./intercalar";

/**
 * Intercalação por descanso. `intercalarComDescanso` alterna as camadas (fases)
 * das categorias para que ninguém lute duas vezes seguidas; `agruparEmCamadas`
 * fatia as lutas de uma chave nas suas camadas topológicas (rodada na simples,
 * nível de disputa na dupla), descartando byes/walkover/mortas.
 */

describe("intercalarComDescanso", () => {
  it("uma categoria sozinha: corre em sequência (back-to-back inevitável)", () => {
    // chave de 3: L1 (A×B → V) , L2 (V × C). Sem outra categoria não há descanso.
    expect(intercalarComDescanso([[["A-L1"], ["A-L2"]]])).toEqual(["A-L1", "A-L2"]);
  });

  it("duas categorias de mesmo tamanho: intercala e dá descanso", () => {
    // 2× chave de 3 → A-L1, B-L1, A-L2, B-L2: V(A) descansa durante B-L1
    const A = [["A-L1"], ["A-L2"]];
    const B = [["B-L1"], ["B-L2"]];
    expect(intercalarComDescanso([A, B])).toEqual([
      "A-L1",
      "B-L1",
      "A-L2",
      "B-L2",
    ]);
  });

  it("tamanhos diferentes: alterna por camada e a maior segue sozinha no fim", () => {
    const a = [["a1"], ["a2"], ["a3"]];
    const b = [["b1"], ["b2"]];
    expect(intercalarComDescanso([a, b])).toEqual([
      "a1",
      "b1",
      "a2",
      "b2",
      "a3",
    ]);
  });

  it("mantém as lutas de uma mesma camada juntas (são independentes)", () => {
    const a = [["a1p0", "a1p1"], ["a2p0"]];
    const b = [["b1p0"]];
    expect(intercalarComDescanso([a, b])).toEqual([
      "a1p0",
      "a1p1",
      "b1p0",
      "a2p0",
    ]);
  });

  it("três categorias: a de camada única entra cedo e as demais alternam", () => {
    const a = [["a1"], ["a2"]];
    const b = [["b1"]];
    const c = [["c1"], ["c2"]];
    expect(intercalarComDescanso([a, b, c])).toEqual([
      "a1",
      "b1",
      "c1",
      "a2",
      "c2",
    ]);
  });

  it("lida com listas vazias", () => {
    expect(intercalarComDescanso([])).toEqual([]);
    expect(intercalarComDescanso([[], [["x"]]])).toEqual(["x"]);
  });
});

describe("intercalarCategorias — respeita os dias", () => {
  it("modo automático (dataFixada nula): intercala tudo junto", () => {
    const out = intercalarCategorias([
      { dataFixada: null, camadas: [["A-L1"], ["A-L2"]] },
      { dataFixada: null, camadas: [["B-L1"], ["B-L2"]] },
    ]);
    expect(out).toEqual(["A-L1", "B-L1", "A-L2", "B-L2"]);
  });

  it("modo por dia: não mistura dias, mas intercala dentro de cada um", () => {
    const out = intercalarCategorias([
      { dataFixada: "2026-05-10", camadas: [["A-L1"], ["A-L2"]] },
      { dataFixada: "2026-05-10", camadas: [["B-L1"], ["B-L2"]] },
      { dataFixada: "2026-05-11", camadas: [["C-L1"], ["C-L2"]] },
      { dataFixada: "2026-05-11", camadas: [["D-L1"], ["D-L2"]] },
    ]);
    // dia 1 (A,B intercalados) inteiro antes do dia 2 (C,D intercalados)
    expect(out).toEqual([
      "A-L1", "B-L1", "A-L2", "B-L2",
      "C-L1", "D-L1", "C-L2", "D-L2",
    ]);
  });
});

/** monta uma linha de luta mínima (só os campos que agruparEmCamadas usa) */
function luta(over: Partial<LutaEmCamada> & { id: string }): LutaEmCamada {
  return {
    rodada: 1,
    posicao: 0,
    fase: null,
    vencedorInscricaoId: null,
    atleta1InscricaoId: "x",
    atleta2InscricaoId: "y",
    proximaLutaId: null,
    proximaLutaSlot: null,
    proximaLutaPerdedorId: null,
    proximaLutaPerdedorSlot: null,
    ...over,
  };
}

const ids = (camadas: LutaEmCamada[][]) => camadas.map((c) => c.map((l) => l.id));

describe("agruparEmCamadas — eliminação simples", () => {
  it("agrupa por rodada (chave de 4: 2 lutas na 1ª, final na 2ª)", () => {
    const linhas = [
      luta({ id: "L1", rodada: 1, posicao: 0 }),
      luta({ id: "L2", rodada: 1, posicao: 1 }),
      luta({ id: "L3", rodada: 2, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null }),
    ];
    expect(ids(agruparEmCamadas(linhas, "eliminacao_simples", { incluirDecididas: true }))).toEqual([
      ["L1", "L2"],
      ["L3"],
    ]);
  });

  it("descarta o bye (chave de 3: só L1 e a final são lutas de fato)", () => {
    const linhas = [
      luta({ id: "L1", rodada: 1, posicao: 0 }),
      // bye: nó da 1ª rodada com um atleta só → não é luta
      luta({ id: "BYE", rodada: 1, posicao: 1, atleta2InscricaoId: null }),
      luta({ id: "L3", rodada: 2, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null }),
    ];
    expect(ids(agruparEmCamadas(linhas, "eliminacao_simples", { incluirDecididas: true }))).toEqual([
      ["L1"],
      ["L3"],
    ]);
  });

  it("com incluirDecididas=false, camada totalmente decidida some sem deixar buraco", () => {
    // chave de 4 com a 1ª rodada já resolvida: a fila ao vivo começa direto na final
    const linhas = [
      luta({ id: "L1", rodada: 1, posicao: 0, vencedorInscricaoId: "x" }),
      luta({ id: "L2", rodada: 1, posicao: 1, vencedorInscricaoId: "x" }),
      luta({ id: "L3", rodada: 2, posicao: 0 }),
    ];
    expect(ids(agruparEmCamadas(linhas, "eliminacao_simples", { incluirDecididas: false }))).toEqual([
      ["L3"],
    ]);
  });
});

describe("agruparEmCamadas — eliminação dupla", () => {
  it("usa o nível de disputa (grande final por último) e desempata por fase", () => {
    // dupla de 4: WB(w1,w2)→w3 ; perdedores→l1 ; l1+perdedor(w3)→l2 ; w3+l2→gf.
    // A rodada crua guarda a gf como "rodada 1"; o nível topológico a joga p/ o fim.
    const linhas = [
      luta({ id: "w1", fase: "wb", rodada: 1, posicao: 0, proximaLutaId: "w3", proximaLutaSlot: 1, proximaLutaPerdedorId: "l1", proximaLutaPerdedorSlot: 1 }),
      luta({ id: "w2", fase: "wb", rodada: 1, posicao: 1, proximaLutaId: "w3", proximaLutaSlot: 2, proximaLutaPerdedorId: "l1", proximaLutaPerdedorSlot: 2 }),
      luta({ id: "w3", fase: "wb", rodada: 2, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null, proximaLutaId: "gf", proximaLutaSlot: 1, proximaLutaPerdedorId: "l2", proximaLutaPerdedorSlot: 2 }),
      luta({ id: "l1", fase: "lb", rodada: 1, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null, proximaLutaId: "l2", proximaLutaSlot: 1 }),
      luta({ id: "l2", fase: "lb", rodada: 2, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null, proximaLutaId: "gf", proximaLutaSlot: 2 }),
      luta({ id: "gf", fase: "gf", rodada: 1, posicao: 0, atleta1InscricaoId: null, atleta2InscricaoId: null }),
    ];
    expect(ids(agruparEmCamadas(linhas, "eliminacao_dupla", { incluirDecididas: true }))).toEqual([
      ["w1", "w2"], // nível 0
      ["w3", "l1"], // nível 1 — WB antes de LB
      ["l2"], // nível 2
      ["gf"], // nível 3 — grande final por último
    ]);
  });
});
