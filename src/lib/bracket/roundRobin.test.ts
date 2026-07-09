import { describe, expect, it } from "vitest";
import {
  classificacaoRoundRobin,
  gerarRoundRobin,
  podioRoundRobin,
  registrarResultadoRoundRobin,
} from "./roundRobin";
import type { Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${i + 1}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

describe("gerarRoundRobin", () => {
  it("exige ao menos 2 inscritos", () => {
    expect(() => gerarRoundRobin(inscritos(1), { seed: "s" })).toThrow();
  });

  it("rejeita ids duplicados", () => {
    const dupla = [...inscritos(2), { id: "atleta-1" }];
    expect(() => gerarRoundRobin(dupla, { seed: "s" })).toThrow();
  });

  it("2 atletas: 1 luta", () => {
    const chave = gerarRoundRobin(inscritos(2), { seed: "s" });
    expect(chave.formato).toBe("round_robin");
    expect(chave.lutas).toHaveLength(1);
  });

  it("3 atletas: 3 lutas, todos contra todos, um descanso por rodada", () => {
    const chave = gerarRoundRobin(inscritos(3), { seed: "s" });
    expect(chave.lutas).toHaveLength(3);
    expect(chave.rodadas).toBe(3);
    // cada rodada tem exatamente 1 luta
    for (let r = 1; r <= 3; r++) {
      expect(chave.lutas.filter((l) => l.rodada === r)).toHaveLength(1);
    }
    // todos os pares se enfrentam exatamente uma vez
    const pares = chave.lutas.map((l) => [l.atleta1, l.atleta2].sort().join("×"));
    expect(new Set(pares).size).toBe(3);
  });

  it("5 atletas: n(n-1)/2 lutas e ninguém luta duas vezes na mesma rodada", () => {
    const chave = gerarRoundRobin(inscritos(5), { seed: "s" });
    expect(chave.lutas).toHaveLength(10);
    for (let r = 1; r <= chave.rodadas; r++) {
      const daRodada = chave.lutas.filter((l) => l.rodada === r);
      const atletas = daRodada.flatMap((l) => [l.atleta1, l.atleta2]);
      expect(new Set(atletas).size).toBe(atletas.length);
    }
  });

  it("é determinística por seed", () => {
    const a = gerarRoundRobin(inscritos(4), { seed: "x" });
    const b = gerarRoundRobin(inscritos(4), { seed: "x" });
    const c = gerarRoundRobin(inscritos(4), { seed: "y" });
    expect(a).toEqual(b);
    expect(a.lutas.map((l) => l.atleta1).join()).not.toBe(
      c.lutas.map((l) => l.atleta1).join(),
    );
  });
});

describe("resultado e classificação", () => {
  it("rejeita vencedor que não é da luta", () => {
    const chave = gerarRoundRobin(inscritos(2), { seed: "s" });
    expect(() =>
      registrarResultadoRoundRobin(chave, chave.lutas[0].id, "intruso", "pontos"),
    ).toThrow();
  });

  it("permite corrigir resultado (sem avanço de vencedor)", () => {
    let chave = gerarRoundRobin(inscritos(2), { seed: "s" });
    const luta = chave.lutas[0];
    chave = registrarResultadoRoundRobin(chave, luta.id, luta.atleta1!, "pontos");
    chave = registrarResultadoRoundRobin(chave, luta.id, luta.atleta2!, "decisao");
    expect(chave.lutas[0].vencedor).toBe(luta.atleta2);
  });

  it("pódio fica nulo enquanto houver luta pendente", () => {
    const chave = gerarRoundRobin(inscritos(3), { seed: "s" });
    expect(podioRoundRobin(chave)).toEqual({
      primeiro: null,
      segundo: null,
      terceiros: [],
    });
  });

  it("classifica por vitórias e usa confronto direto no empate a dois", () => {
    // A vence B e C (2 vitórias). B vence C (1). C: 0.
    let chave = gerarRoundRobin(inscritos(3), { seed: "s" });
    const [a, b, c] = ["atleta-1", "atleta-2", "atleta-3"];
    for (const luta of chave.lutas) {
      const par = [luta.atleta1, luta.atleta2];
      const vencedor = par.includes(a) ? a : b;
      chave = registrarResultadoRoundRobin(chave, luta.id, vencedor, "pontos");
    }
    const podio = podioRoundRobin(chave);
    expect(podio.primeiro).toBe(a);
    expect(podio.segundo).toBe(b);
    expect(podio.terceiros).toEqual([c]);
  });

  it("desempata por finalização quando não há confronto direto decisivo", () => {
    // 2 atletas, 1 luta: vencedor por finalização fica à frente — caso
    // degenerado para exercitar o critério das finalizações no empate geral
    let chave = gerarRoundRobin(inscritos(2), { seed: "s" });
    const luta = chave.lutas[0];
    chave = registrarResultadoRoundRobin(chave, luta.id, luta.atleta2!, "finalizacao");
    const [primeiro, segundo] = classificacaoRoundRobin(chave);
    expect(primeiro.atleta).toBe(luta.atleta2);
    expect(primeiro.finalizacoes).toBe(1);
    expect(segundo.vitorias).toBe(0);
  });
});
