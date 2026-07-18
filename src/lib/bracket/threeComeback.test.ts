import { describe, expect, it } from "vitest";
import {
  gerarTresRepescagem,
  podioTresRepescagem,
  registrarResultadoTresRepescagem,
  tresRepescagemConcluida,
} from "./threeComeback";
import type { Chave, Inscrito } from "./types";

function inscritos(n: number): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${i + 1}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

const m = (chave: Chave, id: string) => chave.lutas.find((l) => l.id === id)!;

describe("gerarTresRepescagem", () => {
  it("exige exatamente 3 atletas", () => {
    expect(() => gerarTresRepescagem(inscritos(2), { seed: "s" })).toThrow();
    expect(() => gerarTresRepescagem(inscritos(4), { seed: "s" })).toThrow();
  });

  it("monta M1 (A×B), repescagem (C×?) e final vazia", () => {
    const chave = gerarTresRepescagem(inscritos(3), { seed: "s" });
    expect(chave.formato).toBe("tres_repescagem");
    expect(chave.lutas).toHaveLength(3);
    expect(m(chave, "m1").atleta1).not.toBeNull();
    expect(m(chave, "m1").atleta2).not.toBeNull();
    expect(m(chave, "m2").atleta1).not.toBeNull();
    expect(m(chave, "m2").atleta2).toBeNull();
    expect(m(chave, "m3").atleta1).toBeNull();
    expect(m(chave, "m3").proximaLutaId).toBeNull();
  });

  it("é determinística por seed", () => {
    expect(gerarTresRepescagem(inscritos(3), { seed: "x" })).toEqual(
      gerarTresRepescagem(inscritos(3), { seed: "x" }),
    );
  });
});

describe("avanço e pódio", () => {
  it("perdedor de M1 cai na repescagem; vencedores vão à final", () => {
    let chave = gerarTresRepescagem(inscritos(3), { seed: "s" });
    const a = m(chave, "m1").atleta1!;
    const b = m(chave, "m1").atleta2!;
    const c = m(chave, "m2").atleta1!;

    chave = registrarResultadoTresRepescagem(chave, "m1", a, "pontos");
    // A à final (slot1); B (perdedor) à repescagem
    expect(m(chave, "m3").atleta1).toBe(a);
    expect(m(chave, "m2").atleta2).toBe(b);

    chave = registrarResultadoTresRepescagem(chave, "m2", c, "pontos");
    expect(m(chave, "m3").atleta2).toBe(c);
    expect(tresRepescagemConcluida(chave)).toBe(false);

    chave = registrarResultadoTresRepescagem(chave, "m3", a, "finalizacao");
    expect(tresRepescagemConcluida(chave)).toBe(true);

    const podio = podioTresRepescagem(chave);
    expect(podio.primeiro).toBe(a); // campeão
    expect(podio.segundo).toBe(c); // perdedor da final
    expect(podio.terceiros).toEqual([b]); // perdedor da repescagem
  });

  it("bloqueia correção depois da final decidida", () => {
    let chave = gerarTresRepescagem(inscritos(3), { seed: "s" });
    const a = m(chave, "m1").atleta1!;
    const c = m(chave, "m2").atleta1!;
    chave = registrarResultadoTresRepescagem(chave, "m1", a, "pontos");
    chave = registrarResultadoTresRepescagem(chave, "m2", c, "pontos");
    chave = registrarResultadoTresRepescagem(chave, "m3", a, "pontos");
    expect(() =>
      registrarResultadoTresRepescagem(chave, "m1", a, "pontos"),
    ).toThrow();
  });
});
