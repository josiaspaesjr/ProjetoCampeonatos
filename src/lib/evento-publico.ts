import { cache } from "react";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";

/**
 * Carregador compartilhado entre o layout público do evento (`(abas)/layout`)
 * e as páginas de cada aba. Envolto em `cache()` do React para deduplicar a
 * consulta dentro de uma mesma requisição — layout e página batem no banco
 * uma vez só.
 */

export type EventoPublico = NonNullable<
  Awaited<ReturnType<typeof getEventoPublico>>
>;

export const getEventoPublico = cache(async (slug: string) => {
  const db = await getDb();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), ne(eventos.status, "rascunho")),
  });
  if (!evento) return null;

  const agora = new Date();
  const todosLotes = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, evento.id),
    orderBy: asc(lotes.inicio),
  });

  const loteVigente =
    todosLotes.find((l) => l.inicio <= agora && agora <= l.fim) ?? null;

  const inscricoesAbertas =
    evento.status === "publicado" &&
    !!loteVigente &&
    (!evento.inscricoesFecham || agora <= evento.inscricoesFecham);

  return { evento, loteVigente, inscricoesAbertas };
});

/** Selo de status exibido no hero (rótulo + se pulsa o ponto "ao vivo"). */
export function statusDoEvento(
  status: string,
  inscricoesAbertas: boolean,
): { rotulo: string; vivo: boolean } {
  if (status === "em_andamento") return { rotulo: "Ao vivo agora", vivo: true };
  if (inscricoesAbertas) return { rotulo: "Inscrições abertas", vivo: true };
  if (status === "finalizado")
    return { rotulo: "Evento finalizado", vivo: false };
  return { rotulo: "Inscrições encerradas", vivo: false };
}

/** Contadores exibidos nas abas (Atletas = confirmados, Chaves = publicadas). */
export const getContadoresEvento = cache(async (eventoId: string) => {
  const db = await getDb();

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
    columns: { id: true },
  });

  const atletas = await db.$count(
    inscricoes,
    and(
      eq(inscricoes.eventoId, eventoId),
      eq(inscricoes.status, "confirmada"),
    ),
  );

  const chavesPublicadas = cats.length
    ? await db.$count(
        chaves,
        and(
          inArray(
            chaves.categoriaId,
            cats.map((c) => c.id),
          ),
          ne(chaves.status, "rascunho"),
        ),
      )
    : 0;

  return { atletas, chaves: chavesPublicadas };
});
