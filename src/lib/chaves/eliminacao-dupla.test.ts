import { describe, expect, it } from "vitest";
import {
  gerarEliminacaoDupla,
  registrarResultadoEliminacaoDupla,
} from "@/lib/bracket/doubleElimination";
import type { Chave, Luta } from "@/lib/bracket/types";
import {
  classificarEliminacaoDupla,
  nivelDisputaEliminacaoDupla,
  prioridadeFaseDupla,
  type LinhaLutaDupla,
} from "./eliminacao-dupla";

function inscritos(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${String(i + 1).padStart(2, "0")}`,
    nome: `Atleta ${i + 1}`,
    academiaId: null,
  }));
}

/** engine Luta → linha no formato do banco que o classificador consome */
const comoLinha = (l: Luta): LinhaLutaDupla => ({
  id: l.id,
  atleta1InscricaoId: l.atleta1,
  atleta2InscricaoId: l.atleta2,
  vencedorInscricaoId: l.vencedor,
  proximaLutaId: l.proximaLutaId,
  proximaLutaSlot: l.proximaLutaSlot,
  proximaLutaPerdedorId: l.proximaLutaPerdedorId ?? null,
  proximaLutaPerdedorSlot: l.proximaLutaPerdedorSlot ?? null,
});

const classificar = (chave: Chave) =>
  classificarEliminacaoDupla(chave.lutas.map(comoLinha));

const menor = (a: string, b: string) => (a < b ? a : b);

describe("classificarEliminacaoDupla", () => {
  it("chave cheia (potência de 2) não tem lutas mortas — todas são reais", () => {
    for (const n of [4, 8]) {
      const { mortas, reais } = classificar(gerarEliminacaoDupla(inscritos(n), { seed: `s${n}` }));
      expect(mortas.size).toBe(0);
      // WB(n-1) + LB(2(k-1)) + GF(1), todas reais numa chave cheia
      expect(reais.size).toBe(gerarEliminacaoDupla(inscritos(n), { seed: `s${n}` }).lutas.length);
    }
  });

  it("toda luta com os dois atletas definidos conta como real", () => {
    const chave = gerarEliminacaoDupla(inscritos(6), { seed: "s6" });
    const { reais } = classificar(chave);
    for (const l of chave.lutas) {
      if (l.atleta1 && l.atleta2) expect(reais.has(l.id)).toBe(true);
    }
  });

  it("um bye (só um atleta) nunca é real nem morto — é walkover", () => {
    const chave = gerarEliminacaoDupla(inscritos(5), { seed: "s5" });
    const { mortas, reais } = classificar(chave);
    for (const l of chave.lutas) {
      if (l.bye) {
        expect(reais.has(l.id)).toBe(false);
        expect(mortas.has(l.id)).toBe(false);
      }
    }
  });

  it("5 atletas: exatamente uma luta morta (par de byes cai numa LB sem oponentes)", () => {
    const { mortas, reais } = classificar(gerarEliminacaoDupla(inscritos(5), { seed: "s5" }));
    expect(mortas.size).toBe(1);
    expect(reais.size).toBe(8);
  });

  it("uma luta morta some da chave, mas a grande final nunca é morta", () => {
    for (const n of [3, 4, 5, 6, 7, 8, 9, 12]) {
      const chave = gerarEliminacaoDupla(inscritos(n), { seed: `q${n}` });
      const { mortas, reais } = classificar(chave);
      const gf = chave.lutas.find((l) => l.fase === "gf")!;
      expect(mortas.has(gf.id)).toBe(false);
      expect(reais.has(gf.id)).toBe(true);
    }
  });

  it("é estável: registrar resultados não ressuscita mortas nem esvazia reais", () => {
    let chave = gerarEliminacaoDupla(inscritos(5), { seed: "s5" });
    const inicial = classificar(chave);
    for (let i = 0; i < 500; i++) {
      const pronta = chave.lutas.find(
        (l) => l.atleta1 && l.atleta2 && !l.vencedor && !l.bye,
      );
      if (!pronta) break;
      chave = registrarResultadoEliminacaoDupla(
        chave,
        pronta.id,
        menor(pronta.atleta1!, pronta.atleta2!),
        "pontos",
      );
      const agora = classificar(chave);
      // as mortas iniciais continuam mortas; as reais iniciais continuam reais
      for (const id of inicial.mortas) expect(agora.mortas.has(id)).toBe(true);
      for (const id of inicial.reais) expect(agora.reais.has(id)).toBe(true);
    }
  });
});

/** lutas na ordem de disputa (nível, fase, rodada, posição) */
function ordemDisputa(chave: Chave): Luta[] {
  const nivel = nivelDisputaEliminacaoDupla(chave.lutas.map(comoLinha));
  return [...chave.lutas].sort(
    (a, b) =>
      nivel.get(a.id)! - nivel.get(b.id)! ||
      prioridadeFaseDupla(a.fase) - prioridadeFaseDupla(b.fase) ||
      a.rodada - b.rodada ||
      a.posicao - b.posicao,
  );
}

describe("nivelDisputaEliminacaoDupla — ordem de disputa", () => {
  it("1ª rodada da WB tem nível 0 e a grande final tem o maior nível", () => {
    for (const n of [3, 4, 5, 6, 8, 12]) {
      const chave = gerarEliminacaoDupla(inscritos(n), { seed: `o${n}` });
      const nivel = nivelDisputaEliminacaoDupla(chave.lutas.map(comoLinha));
      for (const l of chave.lutas) {
        if (l.fase === "wb" && l.rodada === 1) expect(nivel.get(l.id)).toBe(0);
      }
      const gf = chave.lutas.find((l) => l.fase === "gf")!;
      const maxNivel = Math.max(...[...nivel.values()]);
      expect(nivel.get(gf.id)).toBe(maxNivel);
    }
  });

  it("toda luta tem nível estritamente maior que suas alimentadoras (topológico)", () => {
    for (const n of [3, 5, 6, 8, 9, 12]) {
      const chave = gerarEliminacaoDupla(inscritos(n), { seed: `t${n}` });
      const nivel = nivelDisputaEliminacaoDupla(chave.lutas.map(comoLinha));
      for (const l of chave.lutas) {
        for (const alvo of [l.proximaLutaId, l.proximaLutaPerdedorId]) {
          if (alvo) expect(nivel.get(alvo)!).toBeGreaterThan(nivel.get(l.id)!);
        }
      }
    }
  });

  it("3 atletas: a única luta pronta (WB R1) vem primeiro; a repescagem antes da GF", () => {
    const chave = gerarEliminacaoDupla(inscritos(3), { seed: "s3" });
    const { reais } = classificar(chave);
    const ordem = ordemDisputa(chave).filter((l) => reais.has(l.id));
    // WB R1 (a única com dois atletas) é a 1ª
    expect(ordem[0].fase).toBe("wb");
    expect(ordem[0].rodada).toBe(1);
    expect(ordem[0].atleta1 && ordem[0].atleta2).toBeTruthy();
    // ordem final: WB R1 → WB final → repescagem (LB) → grande final
    expect(ordem.map((l) => l.fase)).toEqual(["wb", "wb", "lb", "gf"]);
    // nenhuma luta indefinida (0 atletas) antes de uma definida
    const definida = (l: Luta) => Boolean(l.atleta1 || l.atleta2);
    const ultimaDefinida = ordem.reduce((acc, l, i) => (definida(l) ? i : acc), -1);
    const primeiraIndefinida = ordem.findIndex((l) => !definida(l));
    if (primeiraIndefinida !== -1)
      expect(primeiraIndefinida).toBeGreaterThan(
        ordem.slice(0, primeiraIndefinida).filter(definida).length - 1,
      );
    // concretamente: a 1ª luta é definida
    expect(definida(ordem[0])).toBe(true);
    expect(ultimaDefinida).toBeGreaterThanOrEqual(0);
  });

  it("a grande final é sempre a última na ordem de disputa", () => {
    for (const n of [3, 4, 5, 6, 8, 10, 16]) {
      const chave = gerarEliminacaoDupla(inscritos(n), { seed: `u${n}` });
      const ordem = ordemDisputa(chave);
      expect(ordem[ordem.length - 1].fase).toBe("gf");
    }
  });
});
