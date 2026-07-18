import { criarRng, embaralhar } from "./rng";
import {
  calcularPodio,
  gerarEliminacaoSimples,
  registrarResultado,
} from "./singleElimination";
import { classificacaoRoundRobin, gerarRoundRobin } from "./roundRobin";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

/**
 * Multistage — fase de grupos (todos contra todos dentro de cada grupo) e
 * depois um playoff (eliminação simples) entre os classificados. Config fixa:
 * grupos com ~4 atletas e os 2 primeiros de cada grupo avançam.
 *
 * O playoff só existe depois que TODOS os jogos de grupo terminam (a
 * classificação define os classificados), então ele é gerado no registrador,
 * ao encerrar a fase de grupos. O seeding do playoff usa a separação por
 * academia reaproveitando o grupo como "academia" — assim 1º e 2º do mesmo
 * grupo se afastam e não se reencontram na 1ª rodada.
 */

const ALVO_POR_GRUPO = 4;
const CLASSIFICADOS = 2;

const idGrupo = (g: number) => `grupo:${g}`;
const ehGrupo = (l: Luta) => l.fase?.startsWith("grupo:") ?? false;
const ehPlayoff = (l: Luta) => l.fase === "playoff";

export function numeroDeGrupos(n: number): number {
  return Math.max(2, Math.round(n / ALVO_POR_GRUPO));
}

export function gerarMultistage(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length < 4) {
    throw new Error("Multistage exige ao menos 4 atletas");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const sorteados = embaralhar(inscritos, rng);
  const g = numeroDeGrupos(sorteados.length);

  // distribui em serpentina (round-robin) para equilibrar tamanhos
  const grupos: Inscrito[][] = Array.from({ length: g }, () => []);
  sorteados.forEach((a, i) => grupos[i % g].push(a));

  const lutas: Luta[] = [];
  grupos.forEach((atletas, gi) => {
    if (atletas.length < 2) return;
    const rr = gerarRoundRobin(atletas, { seed: `${opcoes.seed}-g${gi}` });
    for (const l of rr.lutas) {
      lutas.push({ ...l, id: `g${gi}-${l.id}`, fase: idGrupo(gi) });
    }
  });

  const rodadas = Math.max(...lutas.map((l) => l.rodada), 1);
  return { formato: "multistage", seed: opcoes.seed, rodadas, lutas };
}

const gruposDaChave = (chave: Chave): string[] =>
  [...new Set(chave.lutas.filter(ehGrupo).map((l) => l.fase!))].sort();

const lutasDoGrupo = (chave: Chave, fase: string): Luta[] =>
  chave.lutas.filter((l) => l.fase === fase);

const lutasDoPlayoff = (chave: Chave): Luta[] => chave.lutas.filter(ehPlayoff);

const fasesGruposConcluidas = (chave: Chave): boolean =>
  chave.lutas.filter(ehGrupo).every((l) => l.vencedor !== null);

/** sub-chave do playoff, para reaproveitar os utilitários da eliminação simples. */
function subPlayoff(chave: Chave): Chave {
  const lutas = lutasDoPlayoff(chave);
  return {
    formato: "eliminacao_simples",
    seed: chave.seed,
    rodadas: Math.max(...lutas.map((l) => l.rodada), 1),
    lutas,
  };
}

/** Gera as lutas do playoff a partir da classificação dos grupos (top-2). */
function gerarPlayoff(chave: Chave): Luta[] {
  const primeiros: Inscrito[] = [];
  const segundos: Inscrito[] = [];
  for (const fase of gruposDaChave(chave)) {
    const rank = classificacaoRoundRobin({
      formato: "round_robin",
      seed: "",
      rodadas: 0,
      lutas: lutasDoGrupo(chave, fase),
    });
    // grupo como "academia" → o seeding afasta 1º e 2º do mesmo grupo
    if (rank[0]) primeiros.push({ id: rank[0].atleta, academiaId: fase });
    if (rank[CLASSIFICADOS - 1])
      segundos.push({ id: rank[CLASSIFICADOS - 1].atleta, academiaId: fase });
  }
  const classificados = [...primeiros, ...segundos];
  const playoff = gerarEliminacaoSimples(classificados, {
    seed: `${chave.seed}-po`,
    separarAcademias: true,
  });
  return playoff.lutas.map((l) => ({
    ...l,
    id: `po-${l.id}`,
    fase: "playoff",
    proximaLutaId: l.proximaLutaId ? `po-${l.proximaLutaId}` : null,
  }));
}

export function registrarResultadoMultistage(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const luta = nova.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);

  if (ehPlayoff(luta)) {
    // delega ao motor de eliminação simples, operando só no sub-playoff
    const sub = subPlayoff(nova);
    const depois = registrarResultado(sub, lutaId, vencedorId, metodo);
    const porId = new Map(depois.lutas.map((l) => [l.id, l]));
    nova.lutas = nova.lutas.map((l) => porId.get(l.id) ?? l);
    return nova;
  }

  // jogo de grupo: sem avanço (round robin)
  if (!luta.atleta1 || !luta.atleta2) {
    throw new Error("A luta ainda não tem os dois atletas definidos");
  }
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }
  luta.vencedor = vencedorId;
  luta.metodo = metodo;

  // encerrou a fase de grupos e ainda não há playoff → gera o playoff
  if (fasesGruposConcluidas(nova) && lutasDoPlayoff(nova).length === 0) {
    nova.lutas.push(...gerarPlayoff(nova));
    nova.rodadas = Math.max(...nova.lutas.map((l) => l.rodada), nova.rodadas);
  }
  return nova;
}

/** true quando o playoff existe e a final foi decidida. */
export function multistageConcluida(chave: Chave): boolean {
  const po = lutasDoPlayoff(chave);
  if (!po.length) return false;
  const rodadaFinal = Math.max(...po.map((l) => l.rodada));
  return po.find((l) => l.rodada === rodadaFinal)?.vencedor != null;
}

/** Pódio a partir do playoff (nulo enquanto ele não existir/concluir). */
export function podioMultistage(chave: Chave): Podio {
  const po = lutasDoPlayoff(chave);
  if (!po.length) return { primeiro: null, segundo: null, terceiros: [] };
  return calcularPodio(subPlayoff(chave));
}
