import { describe, expect, it } from "vitest";
import {
  colocacaoConcluida,
  gerarColocacao,
  podioColocacao,
  rankingColocacao,
  registrarResultadoColocacao,
} from "./placement";
import type { Chave, Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${String(i + 1).padStart(2, "0")}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

function jogarTudo(inicial: Chave, escolher: (a: string, b: string) => string): Chave {
  let chave = inicial;
  for (let i = 0; i < 500; i++) {
    const pronta = chave.lutas.find(
      (l) => l.atleta1 && l.atleta2 && !l.vencedor && !l.bye,
    );
    if (!pronta) break;
    chave = registrarResultadoColocacao(
      chave,
      pronta.id,
      escolher(pronta.atleta1!, pronta.atleta2!),
      "pontos",
    );
  }
  return chave;
}

const menor = (a: string, b: string) => (a < b ? a : b);

describe("gerarColocacao", () => {
  it("exige ao menos 2 atletas e rejeita ids duplicados", () => {
    expect(() => gerarColocacao(inscritos(1), { seed: "s" })).toThrow();
    expect(() =>
      gerarColocacao([{ id: "a" }, { id: "a" }], { seed: "s" }),
    ).toThrow();
  });

  it("é determinística por seed", () => {
    expect(gerarColocacao(inscritos(6), { seed: "x" })).toEqual(
      gerarColocacao(inscritos(6), { seed: "x" }),
    );
  });
});

describe("ranking completo 1..N", () => {
  for (const n of [2, 4, 5, 6, 8]) {
    it(`${n} atletas: conclui e rankeia os ${n} em posições distintas`, () => {
      const chave = jogarTudo(gerarColocacao(inscritos(n), { seed: `s${n}` }), menor);
      expect(colocacaoConcluida(chave)).toBe(true);
      const ranking = rankingColocacao(chave);
      // posições 1..N preenchidas com atletas distintos
      const preenchidos = ranking.filter((r) => r.posicao <= n && r.atleta);
      expect(preenchidos).toHaveLength(n);
      expect(new Set(preenchidos.map((r) => r.atleta)).size).toBe(n);
      // as posições cobrem exatamente 1..N
      expect(preenchidos.map((r) => r.posicao).sort((a, b) => a - b)).toEqual(
        Array.from({ length: n }, (_, i) => i + 1),
      );
    });
  }

  it("com 'menor id vence', atleta-01 fica em 1º e o pódio bate com o ranking", () => {
    const chave = jogarTudo(gerarColocacao(inscritos(8), { seed: "z" }), menor);
    const ranking = rankingColocacao(chave);
    const porPos = new Map(ranking.map((r) => [r.posicao, r.atleta]));
    expect(porPos.get(1)).toBe("atleta-01");
    const podio = podioColocacao(chave);
    expect(podio.primeiro).toBe(porPos.get(1));
    expect(podio.segundo).toBe(porPos.get(2));
    expect(podio.terceiros[0]).toBe(porPos.get(3));
  });
});
