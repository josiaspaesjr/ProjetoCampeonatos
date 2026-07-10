import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { areas, categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { idsDeBye } from "@/lib/chaves/byes";

/**
 * Fila de lutas e cronograma estimado por área.
 *
 * Cada área corre suas categorias em sequência (ordemNaArea); dentro da
 * categoria, as lutas correm por rodada. A estimativa soma a duração
 * regulamentar da faixa + transição, ancorada na hora de início da área
 * (ou agora, se a área já está atrasada).
 */

const TRANSICAO_SEGUNDOS = 60;

/** tempo regulamentar CBJJ por faixa (kids: aproximação por faixa), em segundos */
export function duracaoLutaSegundos(faixa: string | null): number {
  const minutos =
    {
      cinza: 3,
      amarela: 3,
      laranja: 4,
      verde: 4,
      branca: 5,
      azul: 6,
      roxa: 7,
      marrom: 8,
      preta: 10,
    }[faixa ?? ""] ?? 6;
  return minutos * 60 + TRANSICAO_SEGUNDOS;
}

/**
 * Duração estimada por luta da categoria: o organizador pode definir um valor
 * próprio (equivalente ao "estimated time per match" do scoreboard); nulo cai
 * na tabela regulamentar da faixa.
 */
export function duracaoDaCategoria(categoria: {
  faixa: string | null;
  duracaoLutaSegundos: number | null;
}): number {
  return categoria.duracaoLutaSegundos ?? duracaoLutaSegundos(categoria.faixa);
}

/**
 * "Slice": intercala as rodadas das categorias (1ª rodada de todas, depois a
 * 2ª de todas…) em vez de correr cada categoria inteira. Entre duas lutas do
 * mesmo atleta passam a existir as rodadas das outras categorias — é o que
 * garante descanso em divisões pequenas, onde a rodada seguinte vem logo.
 */
export function intercalarPorRodada<T>(gruposPorCategoria: T[][][]): T[] {
  const resultado: T[] = [];
  const maisRodadas = Math.max(0, ...gruposPorCategoria.map((g) => g.length));
  for (let rodada = 0; rodada < maisRodadas; rodada++) {
    for (const grupos of gruposPorCategoria) {
      if (grupos[rodada]) resultado.push(...grupos[rodada]);
    }
  }
  return resultado;
}

type LutaRow = typeof lutas.$inferSelect;
type CategoriaRow = typeof categorias.$inferSelect;

export interface LutaNaFila {
  luta: LutaRow;
  categoria: CategoriaRow;
  horaEstimada: Date;
  /** pronta = os dois atletas definidos, aguardando só o tatame */
  pronta: boolean;
}

export interface FilaDaArea {
  area: typeof areas.$inferSelect;
  fila: LutaNaFila[];
  atletas: Record<string, { nome: string; academia: string | null }>;
}

export async function montarFilaDaArea(
  db: Db,
  areaId: string,
  agora = new Date(),
): Promise<FilaDaArea | null> {
  const area = await db.query.areas.findFirst({ where: eq(areas.id, areaId) });
  if (!area) return null;

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.areaId, areaId),
    orderBy: asc(categorias.ordemNaArea),
  });

  // lutas pendentes de cada categoria, agrupadas por rodada (ordem da chave)
  const gruposPorCategoria: { luta: LutaRow; categoria: CategoriaRow }[][][] = [];
  for (const categoria of cats) {
    const chave = await db.query.chaves.findFirst({
      where: eq(chaves.categoriaId, categoria.id),
    });
    if (!chave || chave.status === "rascunho" || chave.status === "concluida") {
      continue;
    }

    const linhas = await db.query.lutas.findMany({
      where: eq(lutas.chaveId, chave.id),
      orderBy: [asc(lutas.rodada), asc(lutas.posicao)],
    });
    const byes = idsDeBye(linhas, chave.formato);

    const rodadas = new Map<number, { luta: LutaRow; categoria: CategoriaRow }[]>();
    for (const luta of linhas) {
      if (luta.vencedorInscricaoId || byes.has(luta.id)) continue;
      const grupo = rodadas.get(luta.rodada) ?? [];
      grupo.push({ luta, categoria });
      rodadas.set(luta.rodada, grupo);
    }
    if (rodadas.size) {
      gruposPorCategoria.push(
        [...rodadas.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g),
      );
    }
  }

  const ordenadas = area.intercalarRodadas
    ? intercalarPorRodada(gruposPorCategoria)
    : gruposPorCategoria.flat(2);

  const fila: LutaNaFila[] = [];
  let cursor = new Date(
    Math.max(agora.getTime(), area.horaInicio?.getTime() ?? 0),
  );
  for (const { luta, categoria } of ordenadas) {
    const horaEstimada = new Date(cursor);
    cursor = new Date(cursor.getTime() + duracaoDaCategoria(categoria) * 1000);
    fila.push({
      luta,
      categoria,
      horaEstimada,
      pronta: Boolean(luta.atleta1InscricaoId && luta.atleta2InscricaoId),
    });
  }

  const idsInscricoes = [
    ...new Set(
      fila.flatMap((f) =>
        [f.luta.atleta1InscricaoId, f.luta.atleta2InscricaoId].filter(
          (v): v is string => v !== null,
        ),
      ),
    ),
  ];
  const inscritos = idsInscricoes.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, idsInscricoes),
      })
    : [];

  return {
    area,
    fila,
    atletas: Object.fromEntries(
      inscritos.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
    ),
  };
}

export async function montarFilasDoEvento(db: Db, eventoId: string) {
  const todasAreas = await db.query.areas.findMany({
    where: eq(areas.eventoId, eventoId),
    orderBy: asc(areas.ordem),
  });
  const agora = new Date();
  const filas = await Promise.all(
    todasAreas.map((a) => montarFilaDaArea(db, a.id, agora)),
  );
  return filas.filter((f): f is FilaDaArea => f !== null);
}
