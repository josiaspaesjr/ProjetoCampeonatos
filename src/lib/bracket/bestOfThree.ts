import { criarRng, embaralhar } from "./rng";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

/**
 * Melhor de 3 — dois atletas disputam uma série de até 3 lutas; vence quem
 * ganhar 2. Não é árvore: as três lutas são entre os mesmos dois atletas, sem
 * avanço. A 3ª só é necessária quando a série está 1×1. Determinística por seed
 * (a seed só decide quem fica no slot 1/2).
 */
const JOGOS = 3;

export function gerarMelhorDeTres(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length !== 2) {
    throw new Error("Melhor de 3 exige exatamente 2 atletas");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== 2) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const [a, b] = embaralhar(inscritos, rng);
  const lutas: Luta[] = Array.from({ length: JOGOS }, (_, i) => ({
    id: `g${i + 1}`,
    rodada: i + 1,
    posicao: 0,
    atleta1: a.id,
    atleta2: b.id,
    proximaLutaId: null,
    proximaLutaSlot: null,
    vencedor: null,
    metodo: null,
    bye: false,
  }));

  return { formato: "melhor_de_tres", seed: opcoes.seed, rodadas: JOGOS, lutas };
}

/** vitórias por atleta na série. */
function vitorias(chave: Chave): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of chave.lutas) {
    if (l.vencedor) m.set(l.vencedor, (m.get(l.vencedor) ?? 0) + 1);
  }
  return m;
}

/** true quando algum atleta já fez 2 vitórias (série decidida). */
export function serieDecidida(chave: Chave): boolean {
  return [...vitorias(chave).values()].some((v) => v >= 2);
}

/**
 * Registra o resultado de um jogo da série. Sem avanço; a correção é livre
 * (a série é reavaliada pela contagem de vitórias). Não muta a original.
 */
export function registrarResultadoMelhorDeTres(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const luta = nova.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }
  luta.vencedor = vencedorId;
  luta.metodo = metodo;
  return nova;
}

/** Pódio da série: campeão (2 vitórias) e vice. Nulo enquanto indefinido. */
export function podioMelhorDeTres(chave: Chave): Podio {
  const campeao =
    [...vitorias(chave).entries()].find(([, n]) => n >= 2)?.[0] ?? null;
  if (!campeao) return { primeiro: null, segundo: null, terceiros: [] };
  const dupla = [chave.lutas[0]?.atleta1, chave.lutas[0]?.atleta2].filter(
    (x): x is string => x !== null && x !== undefined,
  );
  return {
    primeiro: campeao,
    segundo: dupla.find((id) => id !== campeao) ?? null,
    terceiros: [],
  };
}
