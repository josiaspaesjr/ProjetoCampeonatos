import { describe, expect, it } from "vitest";
import {
  gerarMelhorDeTres,
  podioMelhorDeTres,
  registrarResultadoMelhorDeTres,
  serieDecidida,
} from "./bestOfThree";
import type { Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${i + 1}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

describe("gerarMelhorDeTres", () => {
  it("exige exatamente 2 atletas", () => {
    expect(() => gerarMelhorDeTres(inscritos(1), { seed: "s" })).toThrow();
    expect(() => gerarMelhorDeTres(inscritos(3), { seed: "s" })).toThrow();
  });

  it("rejeita ids duplicados", () => {
    expect(() =>
      gerarMelhorDeTres([{ id: "a" }, { id: "a" }], { seed: "s" }),
    ).toThrow();
  });

  it("gera 3 jogos entre os mesmos 2 atletas, sem avanço", () => {
    const chave = gerarMelhorDeTres(inscritos(2), { seed: "s" });
    expect(chave.formato).toBe("melhor_de_tres");
    expect(chave.lutas).toHaveLength(3);
    expect(chave.rodadas).toBe(3);
    const [a, b] = [chave.lutas[0].atleta1, chave.lutas[0].atleta2];
    for (const l of chave.lutas) {
      expect(l.atleta1).toBe(a);
      expect(l.atleta2).toBe(b);
      expect(l.proximaLutaId).toBeNull();
    }
  });

  it("é determinística por seed", () => {
    expect(gerarMelhorDeTres(inscritos(2), { seed: "x" })).toEqual(
      gerarMelhorDeTres(inscritos(2), { seed: "x" }),
    );
  });
});

describe("resultado e pódio", () => {
  it("série decidida e pódio após 2 vitórias (2×0)", () => {
    let chave = gerarMelhorDeTres(inscritos(2), { seed: "s" });
    const a = chave.lutas[0].atleta1!;
    expect(serieDecidida(chave)).toBe(false);
    chave = registrarResultadoMelhorDeTres(chave, "g1", a, "pontos");
    expect(serieDecidida(chave)).toBe(false);
    chave = registrarResultadoMelhorDeTres(chave, "g2", a, "finalizacao");
    expect(serieDecidida(chave)).toBe(true);
    const podio = podioMelhorDeTres(chave);
    expect(podio.primeiro).toBe(a);
    expect(podio.segundo).toBe(chave.lutas[0].atleta2);
    expect(podio.terceiros).toEqual([]);
  });

  it("vai ao 3º jogo quando está 1×1 e define o campeão", () => {
    let chave = gerarMelhorDeTres(inscritos(2), { seed: "s" });
    const a = chave.lutas[0].atleta1!;
    const b = chave.lutas[0].atleta2!;
    chave = registrarResultadoMelhorDeTres(chave, "g1", a, "pontos");
    chave = registrarResultadoMelhorDeTres(chave, "g2", b, "pontos");
    expect(serieDecidida(chave)).toBe(false);
    chave = registrarResultadoMelhorDeTres(chave, "g3", b, "decisao");
    expect(serieDecidida(chave)).toBe(true);
    expect(podioMelhorDeTres(chave).primeiro).toBe(b);
  });

  it("rejeita vencedor fora da luta", () => {
    const chave = gerarMelhorDeTres(inscritos(2), { seed: "s" });
    expect(() =>
      registrarResultadoMelhorDeTres(chave, "g1", "intruso", "pontos"),
    ).toThrow();
  });
});
