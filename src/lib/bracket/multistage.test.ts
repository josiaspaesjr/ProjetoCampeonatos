import { describe, expect, it } from "vitest";
import {
  gerarMultistage,
  multistageConcluida,
  numeroDeGrupos,
  podioMultistage,
  registrarResultadoMultistage,
} from "./multistage";
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
    chave = registrarResultadoMultistage(
      chave,
      pronta.id,
      escolher(pronta.atleta1!, pronta.atleta2!),
      "pontos",
    );
  }
  return chave;
}

const menor = (a: string, b: string) => (a < b ? a : b);

describe("gerarMultistage", () => {
  it("exige ao menos 4 atletas", () => {
    expect(() => gerarMultistage(inscritos(3), { seed: "s" })).toThrow();
  });

  it("nº de grupos mira ~4 por grupo (mín. 2)", () => {
    expect(numeroDeGrupos(6)).toBe(2);
    expect(numeroDeGrupos(8)).toBe(2);
    expect(numeroDeGrupos(12)).toBe(3);
    expect(numeroDeGrupos(16)).toBe(4);
  });

  it("gera só a fase de grupos (sem playoff ainda)", () => {
    const chave = gerarMultistage(inscritos(8), { seed: "s" });
    expect(chave.formato).toBe("multistage");
    expect(chave.lutas.every((l) => l.fase?.startsWith("grupo:"))).toBe(true);
    expect(chave.lutas.some((l) => l.fase === "playoff")).toBe(false);
    // 8 atletas → 2 grupos de 4 → 6 jogos por grupo = 12
    expect(chave.lutas).toHaveLength(12);
  });

  it("é determinística por seed", () => {
    expect(gerarMultistage(inscritos(8), { seed: "x" })).toEqual(
      gerarMultistage(inscritos(8), { seed: "x" }),
    );
  });
});

describe("grupos → playoff → pódio", () => {
  for (const n of [6, 8, 12]) {
    it(`${n} atletas: encerra grupos, gera playoff, conclui e pódio completo`, () => {
      let chave = gerarMultistage(inscritos(n), { seed: `s${n}` });
      // antes de acabar os grupos, não há playoff
      expect(chave.lutas.some((l) => l.fase === "playoff")).toBe(false);

      chave = jogarTudo(chave, menor);
      // playoff foi criado (2 classificados por grupo)
      const nGrupos = numeroDeGrupos(n);
      expect(chave.lutas.some((l) => l.fase === "playoff")).toBe(true);
      expect(multistageConcluida(chave)).toBe(true);

      const podio = podioMultistage(chave);
      expect(podio.primeiro).not.toBeNull();
      expect(podio.segundo).not.toBeNull();
      const spots = [podio.primeiro, podio.segundo, ...podio.terceiros].filter(Boolean);
      expect(new Set(spots).size).toBe(spots.length); // distintos
      // classificados = 2 por grupo
      const noPlayoff = new Set(
        chave.lutas
          .filter((l) => l.fase === "playoff")
          .flatMap((l) => [l.atleta1, l.atleta2])
          .filter(Boolean),
      );
      expect(noPlayoff.size).toBe(2 * nGrupos);
    });
  }
});
