import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { categorias, eventos, lotes } from "@/db/schema";

/**
 * Requisitos para publicar um evento.
 *
 * Publicar abre as inscrições — por isso exige apenas o mínimo para alguém se
 * inscrever: **ao menos 1 categoria e 1 lote de preço**. NÃO exige atletas
 * inscritos, lutas, chaves nem áreas: tudo isso é preenchido depois (inscrições
 * chegam, chaves e áreas se montam quando fizer sentido). Um evento recém-criado
 * com grade + lote publica vazio.
 *
 * Retorna um **código** neutro de idioma (`nao_encontrado` | `ja_publicado` |
 * `sem_categoria` | `sem_lote`) ou `null` se pode publicar — a UI traduz o
 * código (dic.admin.erros.publicar[código]).
 */
export async function motivoNaoPublicavel(
  db: Db,
  eventoId: string,
): Promise<string | null> {
  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, eventoId),
  });
  if (!evento) return "nao_encontrado";
  if (evento.status !== "rascunho") return "ja_publicado";

  const [cats, lts] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, eventoId) }),
  ]);
  if (!cats.length) return "sem_categoria";
  if (!lts.length) return "sem_lote";
  return null;
}

/**
 * Publica o evento (rascunho → publicado). Lança `Error` com o motivo quando os
 * requisitos não são atendidos. Não depende de atletas/lutas/chaves/áreas.
 */
export async function publicarEventoCore(
  db: Db,
  eventoId: string,
): Promise<void> {
  const motivo = await motivoNaoPublicavel(db, eventoId);
  if (motivo) throw new Error(motivo);
  await db
    .update(eventos)
    .set({ status: "publicado" })
    .where(eq(eventos.id, eventoId));
}
