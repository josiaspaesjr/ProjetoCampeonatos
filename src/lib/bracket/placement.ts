import { agruparPorChave, criarRng, embaralhar } from "./rng";
import {
  ordemSeeds,
  registrarResultadoEliminacaoDupla,
  resolverByes,
} from "./doubleElimination";
import type { Chave, Inscrito, Luta, OpcoesGeracao, Podio } from "./types";

/**
 * Chave de colocação — rankeia TODOS os atletas (1º..Nº). A cada rodada os
 * vencedores disputam as posições de cima e os perdedores as de baixo,
 * recursivamente, até cada posição ser decidida. Reaproveita a rota do perdedor
 * e a resolução de byes (`resolverByes`) da eliminação dupla.
 *
 * O avanço (vencedor + perdedor) é idêntico ao da dupla, então o registrador é
 * o mesmo (`registrarResultadoColocacao`).
 */
export const registrarResultadoColocacao = registrarResultadoEliminacaoDupla;

type Fonte = { atleta: string | null } | { luta: Luta; tipo: "v" | "p" };

export function gerarColocacao(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length < 2) {
    throw new Error("Colocação exige ao menos 2 atletas");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const N = inscritos.length;
  let k = 1;
  while (1 << k < N) k++;
  const size = 1 << k;
  const ordem = ordemSeeds(size);
  const sorteados =
    opcoes.separarAcademias ?? true
      ? agruparPorChave(inscritos, rng, (a, i) => a.academiaId ?? `_${i}`)
      : embaralhar(inscritos, rng);
  const slots = ordem.map((s) => (s <= N ? sorteados[s - 1].id : null));

  const lutas: Luta[] = [];
  let seq = 0;
  const nova = (rodada: number, posicao: number, fase: string): Luta => {
    const l: Luta = {
      id: `c${seq++}`,
      rodada,
      posicao,
      atleta1: null,
      atleta2: null,
      proximaLutaId: null,
      proximaLutaSlot: null,
      proximaLutaPerdedorId: null,
      proximaLutaPerdedorSlot: null,
      fase,
      vencedor: null,
      metodo: null,
      bye: false,
    };
    lutas.push(l);
    return l;
  };

  const ligar = (fonte: Fonte, luta: Luta, slot: 1 | 2) => {
    if ("atleta" in fonte) {
      if (slot === 1) luta.atleta1 = fonte.atleta;
      else luta.atleta2 = fonte.atleta;
    } else if (fonte.tipo === "v") {
      fonte.luta.proximaLutaId = luta.id;
      fonte.luta.proximaLutaSlot = slot;
    } else {
      fonte.luta.proximaLutaPerdedorId = luta.id;
      fonte.luta.proximaLutaPerdedorSlot = slot;
    }
  };

  // rankeia `fontes.length` (potência de 2) nas posições [startPos, +m-1]
  const rankear = (fontes: Fonte[], startPos: number, rodada: number) => {
    const m = fontes.length;
    if (m === 2) {
      // luta decisória: vencedor → startPos, perdedor → startPos+1
      const l = nova(rodada, startPos, `col:${startPos}`);
      ligar(fontes[0], l, 1);
      ligar(fontes[1], l, 2);
      return;
    }
    const round: Luta[] = [];
    for (let p = 0; p < m / 2; p++) {
      const l = nova(rodada, startPos + p, "col");
      ligar(fontes[2 * p], l, 1);
      ligar(fontes[2 * p + 1], l, 2);
      round.push(l);
    }
    rankear(
      round.map((l) => ({ luta: l, tipo: "v" as const })),
      startPos,
      rodada + 1,
    );
    rankear(
      round.map((l) => ({ luta: l, tipo: "p" as const })),
      startPos + m / 2,
      rodada + 1,
    );
  };

  rankear(
    slots.map((a) => ({ atleta: a })),
    1,
    1,
  );

  resolverByes(lutas);
  const rodadas = Math.max(...lutas.map((l) => l.rodada));
  return { formato: "colocacao", seed: opcoes.seed, rodadas, lutas };
}

const posDaFase = (fase: string | null | undefined): number | null => {
  const m = fase?.match(/^col:(\d+)$/);
  return m ? Number(m[1]) : null;
};

/** Colocação final (posição → atleta); posições sem disputa/atleta ficam nulas. */
export function rankingColocacao(
  chave: Chave,
): Array<{ posicao: number; atleta: string | null }> {
  const res: Array<{ posicao: number; atleta: string | null }> = [];
  for (const l of chave.lutas) {
    const pos = posDaFase(l.fase);
    if (pos === null) continue;
    const perdedor =
      l.vencedor && !l.bye
        ? l.vencedor === l.atleta1
          ? l.atleta2
          : l.atleta1
        : null;
    res.push({ posicao: pos, atleta: l.vencedor });
    res.push({ posicao: pos + 1, atleta: perdedor });
  }
  return res.sort((a, b) => a.posicao - b.posicao);
}

/** true quando não há mais luta pronta (dois atletas) sem resultado. */
export function colocacaoConcluida(chave: Chave): boolean {
  return !chave.lutas.some(
    (l) => l.atleta1 && l.atleta2 && !l.vencedor && !l.bye,
  );
}

/** Pódio a partir das lutas decisórias de 1º/2º e 3º/4º. */
export function podioColocacao(chave: Chave): Podio {
  const decisoria = (pos: number) =>
    chave.lutas.find((l) => posDaFase(l.fase) === pos);
  const l1 = decisoria(1);
  const l3 = decisoria(3);
  const perdedorDe = (l: Luta | undefined): string | null =>
    !l || l.vencedor === null || l.bye
      ? null
      : l.vencedor === l.atleta1
        ? l.atleta2
        : l.atleta1;
  return {
    primeiro: l1?.vencedor ?? null,
    segundo: perdedorDe(l1),
    terceiros: l3?.vencedor ? [l3.vencedor] : [],
  };
}
