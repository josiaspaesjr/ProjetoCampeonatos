import type { Chave, Inscrito, Luta, OpcoesGeracao, Podio } from "./types";

/**
 * Votação por jurados — não é confronto: cada atleta faz uma apresentação e os
 * jurados dão nota; o ranking sai da SOMA das notas (desempate pela maior nota
 * individual). Cada apresentação é uma linha de `lutas` (fase "apresentacao",
 * só atleta1); as notas ficam no campo `lutas.notas` (jsonb) e o nº de jurados
 * em `chaves.config.numJurados`. Escala 0–10 com 1 decimal.
 */
export function gerarVotacao(inscritos: Inscrito[], opcoes: OpcoesGeracao): Chave {
  if (inscritos.length < 1) {
    throw new Error("Votação exige ao menos 1 atleta");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }
  const lutas: Luta[] = inscritos.map((a, i) => ({
    id: `ap${i}`,
    rodada: 1,
    posicao: i,
    atleta1: a.id,
    atleta2: null,
    proximaLutaId: null,
    proximaLutaSlot: null,
    proximaLutaPerdedorId: null,
    proximaLutaPerdedorSlot: null,
    fase: "apresentacao",
    vencedor: null,
    metodo: null,
    bye: false,
  }));
  return { formato: "votacao_jurados", seed: opcoes.seed, rodadas: 1, lutas };
}

/** Apresentação: atleta + notas dos jurados (null enquanto não lançadas). */
export interface Apresentacao {
  atleta: string | null;
  notas: number[] | null;
}

const somaNotas = (notas: number[] | null | undefined) =>
  (notas ?? []).reduce((s, n) => s + n, 0);
const maiorNota = (notas: number[] | null | undefined) =>
  notas && notas.length ? Math.max(...notas) : 0;

export interface LinhaRankingVotacao {
  atleta: string;
  total: number;
  notas: number[];
}

/** Ranking: maior soma primeiro; desempate pela maior nota individual. */
export function rankingVotacao(apres: Apresentacao[]): LinhaRankingVotacao[] {
  return apres
    .filter((a): a is { atleta: string; notas: number[] | null } => a.atleta != null)
    .map((a) => ({
      atleta: a.atleta,
      total: somaNotas(a.notas),
      notas: a.notas ?? [],
    }))
    .sort((x, y) => y.total - x.total || maiorNota(y.notas) - maiorNota(x.notas));
}

/** true quando todos os atletas têm as notas de todos os jurados. */
export function votacaoConcluida(apres: Apresentacao[], numJurados: number): boolean {
  const comAtleta = apres.filter((a) => a.atleta != null);
  return (
    comAtleta.length > 0 &&
    comAtleta.every((a) => (a.notas?.length ?? 0) >= numJurados)
  );
}

export function podioVotacao(apres: Apresentacao[]): Podio {
  const r = rankingVotacao(apres);
  return {
    primeiro: r[0]?.atleta ?? null,
    segundo: r[1]?.atleta ?? null,
    terceiros: r[2] ? [r[2].atleta] : [],
  };
}
