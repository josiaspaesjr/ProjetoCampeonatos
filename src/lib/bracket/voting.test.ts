import { describe, expect, it } from "vitest";
import {
  gerarVotacao,
  podioVotacao,
  rankingVotacao,
  votacaoConcluida,
  type Apresentacao,
} from "./voting";
import type { Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}` }));
}

describe("gerarVotacao", () => {
  it("cria uma apresentação por atleta", () => {
    const chave = gerarVotacao(inscritos(3), { seed: "s" });
    expect(chave.formato).toBe("votacao_jurados");
    expect(chave.lutas).toHaveLength(3);
    expect(chave.lutas.every((l) => l.fase === "apresentacao")).toBe(true);
    expect(chave.lutas.every((l) => l.atleta1 && l.atleta2 === null)).toBe(true);
  });

  it("rejeita ids duplicados", () => {
    expect(() => gerarVotacao([{ id: "a" }, { id: "a" }], { seed: "s" })).toThrow();
  });
});

describe("ranking, desempate e pódio", () => {
  const apres: Apresentacao[] = [
    { atleta: "a1", notas: [8, 9, 7] }, // total 24
    { atleta: "a2", notas: [9, 9, 6] }, // total 24
    { atleta: "a3", notas: [10, 8, 9] }, // total 27
    { atleta: "a4", notas: [5, 6, 7] }, // total 18
  ];

  it("ordena pela soma das notas (maior primeiro)", () => {
    const r = rankingVotacao(apres);
    expect(r[0].atleta).toBe("a3");
    expect(r[0].total).toBe(27);
    expect(r[r.length - 1].atleta).toBe("a4");
    expect(r[r.length - 1].total).toBe(18);
  });

  it("desempata pela maior nota individual", () => {
    const empate: Apresentacao[] = [
      { atleta: "x", notas: [7, 7, 6] }, // total 20, maior 7
      { atleta: "y", notas: [9, 6, 5] }, // total 20, maior 9 → à frente
    ];
    expect(rankingVotacao(empate)[0].atleta).toBe("y");
  });

  it("pódio = top 3 do ranking", () => {
    const podio = podioVotacao(apres);
    expect(podio.primeiro).toBe("a3");
    expect(podio.terceiros).toHaveLength(1);
    expect([podio.primeiro, podio.segundo, podio.terceiros[0]].filter(Boolean)).toHaveLength(3);
  });

  it("concluída só quando todos têm as notas de todos os jurados", () => {
    const parcial: Apresentacao[] = [
      { atleta: "a1", notas: [8, 9] },
      { atleta: "a2", notas: null },
    ];
    expect(votacaoConcluida(parcial, 3)).toBe(false);
    const completo: Apresentacao[] = [
      { atleta: "a1", notas: [8, 9, 7] },
      { atleta: "a2", notas: [6, 7, 8] },
    ];
    expect(votacaoConcluida(completo, 3)).toBe(true);
  });
});
