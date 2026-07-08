import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { areas, categorias, chaves, inscricoes, lutas } from "@/db/schema";

/**
 * Fila de lutas e cronograma estimado por área.
 *
 * Cada área corre suas categorias em sequência (ordemNaArea); dentro da
 * categoria, as lutas correm por rodada. A estimativa soma a duração
 * regulamentar da faixa + transição, ancorada na hora de início da área
 * (ou agora, se a área já está atrasada).
 */

const TRANSICAO_SEGUNDOS = 60;

/** tempo regulamentar CBJJ adulto por faixa, em segundos */
export function duracaoLutaSegundos(faixa: string | null): number {
  const minutos =
    { branca: 5, azul: 6, roxa: 7, marrom: 8, preta: 10 }[faixa ?? ""] ?? 6;
  return minutos * 60 + TRANSICAO_SEGUNDOS;
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

function ehBye(l: LutaRow): boolean {
  return (
    l.rodada === 1 &&
    (l.atleta1InscricaoId === null) !== (l.atleta2InscricaoId === null)
  );
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

  const fila: LutaNaFila[] = [];
  let cursor = new Date(
    Math.max(agora.getTime(), area.horaInicio?.getTime() ?? 0),
  );

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

    for (const luta of linhas) {
      if (luta.vencedorInscricaoId || ehBye(luta)) continue;
      const horaEstimada = new Date(cursor);
      cursor = new Date(cursor.getTime() + duracaoLutaSegundos(categoria.faixa) * 1000);
      fila.push({
        luta,
        categoria,
        horaEstimada,
        pronta: Boolean(luta.atleta1InscricaoId && luta.atleta2InscricaoId),
      });
    }
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
