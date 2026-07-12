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
 */
export async function motivoNaoPublicavel(
  db: Db,
  eventoId: string,
): Promise<string | null> {
  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, eventoId),
  });
  if (!evento) return "Evento não encontrado";
  if (evento.status !== "rascunho") return "Evento já publicado";

  const [cats, lts] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, eventoId) }),
  ]);
  if (!cats.length) {
    return "Para publicar, gere ao menos 1 categoria (use o Gerador de grade CBJJ abaixo).";
  }
  if (!lts.length) {
    return "Para publicar, crie ao menos 1 lote de inscrição.";
  }
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
