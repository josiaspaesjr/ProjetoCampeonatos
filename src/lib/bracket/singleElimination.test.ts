import { describe, expect, it } from "vitest";
import {
  calcularPodio,
  gerarEliminacaoSimples,
  registrarResultado,
} from "./singleElimination";
import type { Chave, Inscrito } from "./types";

function inscritos(n: number, academias?: (string | null)[]): Inscrito[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `atleta-${i + 1}`,
    nome: `Atleta ${i + 1}`,
    academiaId: academias ? academias[i] : null,
  }));
}

function lutasDaRodada(chave: Chave, rodada: number) {
  return chave.lutas.filter((l) => l.rodada === rodada);
}

function atletasNaPrimeiraRodada(chave: Chave): string[] {
  return lutasDaRodada(chave, 1)
    .flatMap((l) => [l.atleta1, l.atleta2])
    .filter((a): a is string => a !== null);
}

/** joga todas as lutas prontas, sempre vencendo o atleta1, até concluir */
function simularAte0Final(chave: Chave): Chave {
  let atual = chave;
  let pendente = true;
  while (pendente) {
    pendente = false;
    for (const luta of atual.lutas) {
      if (!luta.vencedor && luta.atleta1 && luta.atleta2) {
        atual = registrarResultado(atual, luta.id, luta.atleta1, "pontos");
        pendente = true;
      }
    }
  }
  return atual;
}

describe("estrutura da chave", () => {
  it.each([
    // byes mínimos: total − 1 luta real, byes só onde a contagem fica ímpar
    [2, 1, 0],
    [3, 2, 1],
    [4, 2, 0],
    [5, 3, 2],
    [6, 3, 1],
    [8, 3, 0],
    [9, 4, 3],
    [10, 4, 2],
    [16, 4, 0],
    [17, 5, 4],
    [20, 5, 2],
  ])("%i inscritos → %i rodadas e %i byes", (n, rodadas, byes) => {
    const chave = gerarEliminacaoSimples(inscritos(n), { seed: "teste" });
    expect(chave.rodadas).toBe(rodadas);

    // cada rodada tem ceil(entrando/2) nós (folding); todas as rodadas somam n
    let entrando = n;
    for (let r = 1; r <= rodadas; r++) {
      const nos = Math.ceil(entrando / 2);
      expect(lutasDaRodada(chave, r)).toHaveLength(nos);
      entrando = nos;
    }

    expect(chave.lutas.filter((l) => l.bye)).toHaveLength(byes);
    // nº de lutas reais (não-bye) = n − 1
    expect(chave.lutas.filter((l) => !l.bye)).toHaveLength(n - 1);
  });

  it("todo inscrito aparece exatamente uma vez na 1ª rodada", () => {
    for (const n of [2, 3, 5, 7, 8, 11, 16, 21, 33]) {
      const chave = gerarEliminacaoSimples(inscritos(n), { seed: "x" });
      const atletas = atletasNaPrimeiraRodada(chave);
      expect(atletas).toHaveLength(n);
      expect(new Set(atletas).size).toBe(n);
    }
  });

  it("encadeamento de avanço aponta para a luta e slot corretos", () => {
    const chave = gerarEliminacaoSimples(inscritos(8), { seed: "x" });
    const r1 = lutasDaRodada(chave, 1);
    expect(r1[0].proximaLutaId).toBe("r2p0");
    expect(r1[0].proximaLutaSlot).toBe(1);
    expect(r1[1].proximaLutaId).toBe("r2p0");
    expect(r1[1].proximaLutaSlot).toBe(2);
    expect(r1[2].proximaLutaId).toBe("r2p1");
    expect(r1[3].proximaLutaSlot).toBe(2);

    const final = lutasDaRodada(chave, 3)[0];
    expect(final.proximaLutaId).toBeNull();
    expect(final.proximaLutaSlot).toBeNull();
  });

  it("bye avança automaticamente para a rodada seguinte", () => {
    const chave = gerarEliminacaoSimples(inscritos(3), { seed: "x" });
    const lutaBye = lutasDaRodada(chave, 1).find((l) => l.bye)!;
    const final = lutasDaRodada(chave, 2)[0];
    const slot = lutaBye.proximaLutaSlot === 1 ? final.atleta1 : final.atleta2;
    expect(lutaBye.vencedor).not.toBeNull();
    expect(slot).toBe(lutaBye.vencedor);
  });

  it("rejeita menos de 2 inscritos e ids duplicados", () => {
    expect(() => gerarEliminacaoSimples(inscritos(1), { seed: "x" })).toThrow();
    expect(() => gerarEliminacaoSimples([], { seed: "x" })).toThrow();
    const dup = [...inscritos(2), { id: "atleta-1" }];
    expect(() => gerarEliminacaoSimples(dup, { seed: "x" })).toThrow(/duplicado/);
  });
});

describe("byes mínimos — todos lutam o quanto antes", () => {
  it("total par: ninguém recebe bye na 1ª rodada; todos lutam", () => {
    for (const n of [4, 6, 10, 12, 20, 50, 100]) {
      const chave = gerarEliminacaoSimples(inscritos(n), { seed: "x" });
      const r1 = lutasDaRodada(chave, 1);
      expect(r1.filter((l) => l.bye)).toHaveLength(0);
      expect(r1.every((l) => l.atleta1 && l.atleta2)).toBe(true);
      // os n atletas aparecem, todos, na 1ª rodada
      expect(atletasNaPrimeiraRodada(chave)).toHaveLength(n);
      expect(r1).toHaveLength(n / 2);
    }
  });

  it("total ímpar: exatamente um bye, e na 1ª rodada", () => {
    for (const n of [5, 7, 11, 21, 99]) {
      const chave = gerarEliminacaoSimples(inscritos(n), { seed: "x" });
      const byesR1 = lutasDaRodada(chave, 1).filter((l) => l.bye);
      expect(byesR1).toHaveLength(1);
      // o bye da 1ª rodada tem um único atleta e já avançou
      expect([byesR1[0].atleta1, byesR1[0].atleta2].filter(Boolean)).toHaveLength(1);
      expect(byesR1[0].vencedor).not.toBeNull();
    }
  });

  it("byes de rodadas seguintes começam vazios (aguardam o alimentador)", () => {
    const chave = gerarEliminacaoSimples(inscritos(20), { seed: "x" });
    for (const l of chave.lutas.filter((x) => x.bye && x.rodada > 1)) {
      expect([l.atleta1, l.atleta2].filter(Boolean)).toHaveLength(0);
      expect(l.vencedor).toBeNull();
    }
  });

  it("ninguém recebe dois byes seguidos: um bye nunca alimenta outro bye", () => {
    for (const n of [10, 11, 20, 40, 96, 300]) {
      const chave = gerarEliminacaoSimples(inscritos(n), { seed: "x" });
      const porId = new Map(chave.lutas.map((l) => [l.id, l]));
      for (const l of chave.lutas.filter((x) => x.bye)) {
        if (l.proximaLutaId) {
          expect(porId.get(l.proximaLutaId)!.bye).toBe(false);
        }
      }
    }
  });

  it("simulação completa: n − 1 lutas reais e final decidida", () => {
    for (const n of [6, 10, 12, 20]) {
      const chave = simularAte0Final(
        gerarEliminacaoSimples(inscritos(n), { seed: "campeonato" }),
      );
      expect(chave.lutas.filter((l) => !l.bye)).toHaveLength(n - 1);
      const final = chave.lutas.find((l) => l.rodada === chave.rodadas)!;
      expect(final.vencedor).not.toBeNull();
    }
  });
});

describe("determinismo do sorteio", () => {
  it("mesma seed e mesmos inscritos geram a mesma chave", () => {
    const a = gerarEliminacaoSimples(inscritos(11), { seed: "evento-42" });
    const b = gerarEliminacaoSimples(inscritos(11), { seed: "evento-42" });
    expect(a).toEqual(b);
  });

  it("seeds diferentes geram sorteios diferentes", () => {
    const posicoes = (seed: string) =>
      atletasNaPrimeiraRodada(gerarEliminacaoSimples(inscritos(16), { seed }));
    // com 16 atletas, a chance de duas seeds produzirem a mesma ordem é ~0
    expect(posicoes("seed-a")).not.toEqual(posicoes("seed-b"));
  });
});

describe("separação de academias na 1ª rodada", () => {
  it("2 academias com 2 atletas cada: nenhum confronto interno na 1ª rodada", () => {
    const chave = gerarEliminacaoSimples(
      inscritos(4, ["alpha", "alpha", "beta", "beta"]),
      { seed: "x" },
    );
    for (const luta of lutasDaRodada(chave, 1)) {
      expect(luta.atleta1).not.toBeNull();
      expect(luta.atleta2).not.toBeNull();
      const [a, b] = [luta.atleta1!, luta.atleta2!].map(
        (id) => Number(id.split("-")[1]) <= 2 ? "alpha" : "beta",
      );
      expect(a).not.toBe(b);
    }
  });

  it("academia com 4 atletas em chave de 8: no máximo 1 por luta", () => {
    const academias = ["alpha", "alpha", "alpha", "alpha", null, null, null, null];
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const chave = gerarEliminacaoSimples(inscritos(8, academias), { seed });
      for (const luta of lutasDaRodada(chave, 1)) {
        const doAlpha = [luta.atleta1, luta.atleta2].filter(
          (id) => id && Number(id.split("-")[1]) <= 4,
        );
        expect(doAlpha.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("caso inviável (3 da mesma academia em chave de 4) não quebra", () => {
    const chave = gerarEliminacaoSimples(
      inscritos(4, ["alpha", "alpha", "alpha", "beta"]),
      { seed: "x" },
    );
    expect(atletasNaPrimeiraRodada(chave)).toHaveLength(4);
  });

  it("separarAcademias: false ignora academias", () => {
    const chave = gerarEliminacaoSimples(
      inscritos(4, ["alpha", "alpha", "beta", "beta"]),
      { seed: "x", separarAcademias: false },
    );
    expect(atletasNaPrimeiraRodada(chave)).toHaveLength(4);
  });
});

describe("distância entre atletas da mesma academia", () => {
  // rodada em que dois atletas se cruzariam se ambos sempre vencessem
  function rodadaDeEncontro(chave: Chave, id1: string, id2: string): number {
    const r1 = lutasDaRodada(chave, 1);
    const posicao = (id: string) =>
      r1.findIndex((l) => l.atleta1 === id || l.atleta2 === id);
    const p1 = posicao(id1);
    const p2 = posicao(id2);
    let r = 1;
    while (Math.floor(p1 / 2 ** (r - 1)) !== Math.floor(p2 / 2 ** (r - 1))) r++;
    return r;
  }

  function encontroMaisCedo(chave: Chave, ids: string[]): number {
    let menor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        menor = Math.min(menor, rodadaDeEncontro(chave, ids[i], ids[j]));
      }
    }
    return menor;
  }

  it("2 atletas da mesma academia caem em metades opostas (só se cruzam na final)", () => {
    const academias = ["alpha", "alpha", null, null, null, null, null, null];
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const chave = gerarEliminacaoSimples(inscritos(8, academias), { seed });
      expect(rodadaDeEncontro(chave, "atleta-1", "atleta-2")).toBe(chave.rodadas);
    }
  });

  it.each([
    // [tamanho, atletasNaAcademia] → encontro mais cedo = rodadas - ceil(log2 k) + 1
    [8, 2, 3],
    [8, 3, 2],
    [8, 4, 2],
    [16, 2, 4],
    [16, 3, 3],
    [16, 5, 2],
    [16, 8, 2],
  ])(
    "academia de %i… (chave %i) se cruza o mais tarde possível: rodada %i",
    (tamanho, k, esperado) => {
      const academias = Array.from({ length: tamanho }, (_, i) =>
        i < k ? "alpha" : null,
      );
      const idsAlpha = Array.from({ length: k }, (_, i) => `atleta-${i + 1}`);
      for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
        const chave = gerarEliminacaoSimples(inscritos(tamanho, academias), {
          seed,
        });
        expect(encontroMaisCedo(chave, idsAlpha)).toBe(esperado);
      }
    },
  );

  it("duas academias grandes são afastadas simultaneamente", () => {
    // 4 atletas de cada, intercalados; em chave de 8 o encontro interno mais
    // cedo possível é a semifinal (rodada 2) para as duas academias
    const academias = ["alpha", "beta", "alpha", "beta", "alpha", "beta", "alpha", "beta"];
    const alpha = ["atleta-1", "atleta-3", "atleta-5", "atleta-7"];
    const beta = ["atleta-2", "atleta-4", "atleta-6", "atleta-8"];
    for (const seed of ["s1", "s2", "s3"]) {
      const chave = gerarEliminacaoSimples(inscritos(8, academias), { seed });
      expect(encontroMaisCedo(chave, alpha)).toBe(2);
      expect(encontroMaisCedo(chave, beta)).toBe(2);
    }
  });
});

describe("registro de resultados", () => {
  it("vencedor avança para o slot correto e a original não é mutada", () => {
    const chave = gerarEliminacaoSimples(inscritos(4), { seed: "x" });
    const r1 = lutasDaRodada(chave, 1);
    const depois = registrarResultado(chave, r1[0].id, r1[0].atleta1!, "finalizacao");

    const finalDepois = depois.lutas.find((l) => l.rodada === 2)!;
    expect(finalDepois.atleta1).toBe(r1[0].atleta1);
    // original intacta
    expect(chave.lutas.find((l) => l.rodada === 2)!.atleta1).toBeNull();
    expect(chave.lutas[0].vencedor).toBeNull();
  });

  it("rejeita vencedor que não está na luta", () => {
    const chave = gerarEliminacaoSimples(inscritos(4), { seed: "x" });
    expect(() =>
      registrarResultado(chave, "r1p0", "intruso", "pontos"),
    ).toThrow(/vencedor/i);
  });

  it("rejeita resultado em luta sem os dois atletas", () => {
    const chave = gerarEliminacaoSimples(inscritos(4), { seed: "x" });
    expect(() =>
      registrarResultado(chave, "r2p0", "atleta-1", "pontos"),
    ).toThrow(/dois atletas/);
  });

  it("rejeita resultado em luta de bye", () => {
    const chave = gerarEliminacaoSimples(inscritos(3), { seed: "x" });
    const lutaBye = chave.lutas.find((l) => l.bye)!;
    expect(() =>
      registrarResultado(chave, lutaBye.id, lutaBye.vencedor!, "pontos"),
    ).toThrow(/bye/);
  });

  it("permite corrigir resultado enquanto a luta seguinte não foi decidida", () => {
    const chave = gerarEliminacaoSimples(inscritos(4), { seed: "x" });
    const r1 = lutasDaRodada(chave, 1);
    let atual = registrarResultado(chave, r1[0].id, r1[0].atleta1!, "pontos");
    atual = registrarResultado(atual, r1[0].id, r1[0].atleta2!, "dq");

    const final = atual.lutas.find((l) => l.rodada === 2)!;
    expect(final.atleta1).toBe(r1[0].atleta2);
    expect(atual.lutas.find((l) => l.id === r1[0].id)!.metodo).toBe("dq");
  });

  it("bloqueia correção depois que a luta seguinte foi decidida", () => {
    const chave = gerarEliminacaoSimples(inscritos(4), { seed: "x" });
    const r1 = lutasDaRodada(chave, 1);
    let atual = registrarResultado(chave, r1[0].id, r1[0].atleta1!, "pontos");
    atual = registrarResultado(atual, r1[1].id, r1[1].atleta1!, "pontos");
    const final = atual.lutas.find((l) => l.rodada === 2)!;
    atual = registrarResultado(atual, final.id, final.atleta1!, "pontos");

    expect(() =>
      registrarResultado(atual, r1[0].id, r1[0].atleta2!, "dq"),
    ).toThrow(/corrigido/);
  });
});

describe("pódio", () => {
  it("chave de 8: campeão, vice e dois terceiros", () => {
    const chave = simularAte0Final(
      gerarEliminacaoSimples(inscritos(8), { seed: "x" }),
    );
    const podio = calcularPodio(chave);

    const final = chave.lutas.find((l) => l.rodada === 3)!;
    expect(podio.primeiro).toBe(final.vencedor);
    expect(podio.segundo).toBe(
      final.vencedor === final.atleta1 ? final.atleta2 : final.atleta1,
    );
    expect(podio.terceiros).toHaveLength(2);
    // pódio sem repetição
    const todos = [podio.primeiro, podio.segundo, ...podio.terceiros];
    expect(new Set(todos).size).toBe(4);
  });

  it("chave de 3: apenas um terceiro (a outra semi foi bye)", () => {
    const chave = simularAte0Final(
      gerarEliminacaoSimples(inscritos(3), { seed: "x" }),
    );
    const podio = calcularPodio(chave);
    expect(podio.primeiro).not.toBeNull();
    expect(podio.segundo).not.toBeNull();
    expect(podio.terceiros).toHaveLength(1);
  });

  it("chave em andamento: campos ainda não decididos ficam nulos", () => {
    const chave = gerarEliminacaoSimples(inscritos(8), { seed: "x" });
    const podio = calcularPodio(chave);
    expect(podio.primeiro).toBeNull();
    expect(podio.segundo).toBeNull();
    expect(podio.terceiros).toHaveLength(0);
  });

  it("simulação completa de 21 atletas termina consistente", () => {
    const chave = simularAte0Final(
      gerarEliminacaoSimples(inscritos(21), { seed: "campeonato" }),
    );
    // todas as lutas com dois atletas foram decididas
    for (const luta of chave.lutas) {
      if (luta.atleta1 && luta.atleta2) expect(luta.vencedor).not.toBeNull();
    }
    const podio = calcularPodio(chave);
    expect(podio.primeiro).not.toBeNull();
    expect(podio.terceiros.length).toBeGreaterThanOrEqual(1);
  });
});
