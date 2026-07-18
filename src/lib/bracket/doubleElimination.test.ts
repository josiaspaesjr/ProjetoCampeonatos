import { describe, expect, it } from "vitest";
import {
  eliminacaoDuplaConcluida,
  gerarEliminacaoDupla,
  podioEliminacaoDupla,
  registrarResultadoEliminacaoDupla,
} from "./doubleElimination";
import type { Chave, Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${String(i + 1).padStart(2, "0")}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

/** joga a chave inteira escolhendo o vencedor de cada luta pronta. */
function jogarTudo(
  chaveInicial: Chave,
  escolher: (a: string, b: string) => string,
): Chave {
  let chave = chaveInicial;
  for (let i = 0; i < 500; i++) {
    const pronta = chave.lutas.find(
      (l) => l.atleta1 && l.atleta2 && !l.vencedor && !l.bye,
    );
    if (!pronta) break;
    chave = registrarResultadoEliminacaoDupla(
      chave,
      pronta.id,
      escolher(pronta.atleta1!, pronta.atleta2!),
      "pontos",
    );
  }
  return chave;
}

const menor = (a: string, b: string) => (a < b ? a : b);

describe("gerarEliminacaoDupla — estrutura", () => {
  it("exige ao menos 3 atletas e rejeita ids duplicados", () => {
    expect(() => gerarEliminacaoDupla(inscritos(2), { seed: "s" })).toThrow();
    expect(() =>
      gerarEliminacaoDupla([{ id: "a" }, { id: "a" }, { id: "b" }], { seed: "s" }),
    ).toThrow();
  });

  it("4 atletas: WB(3) + LB(2) + GF(1) = 6 lutas, sem byes", () => {
    const chave = gerarEliminacaoDupla(inscritos(4), { seed: "s" });
    expect(chave.formato).toBe("eliminacao_dupla");
    expect(chave.lutas.filter((l) => l.fase === "wb")).toHaveLength(3);
    expect(chave.lutas.filter((l) => l.fase === "lb")).toHaveLength(2);
    expect(chave.lutas.filter((l) => l.fase === "gf")).toHaveLength(1);
    expect(chave.lutas.some((l) => l.bye)).toBe(false);
  });

  it("8 atletas: WB(7) + LB(6) + GF(1) = 14 lutas", () => {
    const chave = gerarEliminacaoDupla(inscritos(8), { seed: "s" });
    expect(chave.lutas.filter((l) => l.fase === "wb")).toHaveLength(7);
    expect(chave.lutas.filter((l) => l.fase === "lb")).toHaveLength(6);
    expect(chave.lutas.filter((l) => l.fase === "gf")).toHaveLength(1);
  });

  it("é determinística por seed", () => {
    expect(gerarEliminacaoDupla(inscritos(6), { seed: "x" })).toEqual(
      gerarEliminacaoDupla(inscritos(6), { seed: "x" }),
    );
  });
});

describe("torneio completo e pódio", () => {
  for (const n of [4, 5, 6, 8]) {
    it(`${n} atletas: conclui e o pódio fica completo e distinto`, () => {
      const chave = jogarTudo(gerarEliminacaoDupla(inscritos(n), { seed: `s${n}` }), menor);
      expect(eliminacaoDuplaConcluida(chave)).toBe(true);
      const podio = podioEliminacaoDupla(chave);
      expect(podio.primeiro).not.toBeNull();
      expect(podio.segundo).not.toBeNull();
      expect(podio.terceiros).toHaveLength(1);
      const spots = [podio.primeiro, podio.segundo, podio.terceiros[0]];
      expect(new Set(spots).size).toBe(3); // três atletas distintos
    });
  }

  it("com 'menor id vence', o menor id é o campeão", () => {
    const chave = jogarTudo(gerarEliminacaoDupla(inscritos(6), { seed: "z" }), menor);
    expect(podioEliminacaoDupla(chave).primeiro).toBe("atleta-01");
  });

  it("perder na WB não elimina: dá para chegar à grande final pela LB", () => {
    // faz atleta-01 perder a 1ª luta e vencer todo o resto → deve ser vice (GF)
    const inicial = gerarEliminacaoDupla(inscritos(4), { seed: "abc" });
    // 1ª luta pronta envolvendo atleta-01: ele perde
    const primeira = inicial.lutas.find(
      (l) => (l.atleta1 === "atleta-01" || l.atleta2 === "atleta-01") && l.atleta1 && l.atleta2,
    )!;
    const oponente =
      primeira.atleta1 === "atleta-01" ? primeira.atleta2! : primeira.atleta1!;
    let chave = registrarResultadoEliminacaoDupla(inicial, primeira.id, oponente, "pontos");
    // daqui em diante atleta-01 vence sempre que estiver na luta
    chave = jogarTudo(chave, (a, b) =>
      a === "atleta-01" || b === "atleta-01" ? "atleta-01" : menor(a, b),
    );
    expect(eliminacaoDuplaConcluida(chave)).toBe(true);
    const podio = podioEliminacaoDupla(chave);
    // atleta-01 perdeu 1x (na WB) mas venceu a LB e a GF → campeão
    expect(podio.primeiro).toBe("atleta-01");
  });
});
