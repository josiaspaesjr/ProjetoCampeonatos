import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { eventoColaboradores, eventos } from "@/db/schema";

type Evento = typeof eventos.$inferSelect;

/**
 * Retorna o evento se o usuário pode gerenciá-lo — é o dono
 * (`eventos.organizadorId`) OU um colaborador ativo. Caso contrário, undefined.
 * Substitui o antigo `where organizadorId = usuario.id` nas telas do console.
 */
export async function eventoGerenciavel(
  db: Db,
  eventoId: string,
  usuarioId: string,
): Promise<Evento | undefined> {
  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, eventoId),
  });
  if (!evento) return undefined;
  if (evento.organizadorId === usuarioId) return evento;
  const colaborador = await db.query.eventoColaboradores.findFirst({
    where: and(
      eq(eventoColaboradores.eventoId, eventoId),
      eq(eventoColaboradores.usuarioId, usuarioId),
      eq(eventoColaboradores.status, "ativo"),
    ),
  });
  return colaborador ? evento : undefined;
}

/** true se o usuário é o dono do evento (ações exclusivas do dono). */
export function ehDonoDoEvento(evento: Evento, usuarioId: string): boolean {
  return evento.organizadorId === usuarioId;
}

/**
 * Eventos que o usuário pode gerenciar: os que criou + os que colabora
 * (colaboração ativa). Mais recentes primeiro; sem duplicar.
 */
export async function eventosGerenciaveis(
  db: Db,
  usuarioId: string,
): Promise<Evento[]> {
  const [proprios, colaboracoes] = await Promise.all([
    db.query.eventos.findMany({
      where: eq(eventos.organizadorId, usuarioId),
      orderBy: desc(eventos.criadoEm),
    }),
    db.query.eventoColaboradores.findMany({
      where: and(
        eq(eventoColaboradores.usuarioId, usuarioId),
        eq(eventoColaboradores.status, "ativo"),
      ),
    }),
  ]);
  const idsProprios = new Set(proprios.map((e) => e.id));
  const idsColab = colaboracoes
    .map((c) => c.eventoId)
    .filter((id) => !idsProprios.has(id));
  const doColab = idsColab.length
    ? await db.query.eventos.findMany({
        where: inArray(eventos.id, idsColab),
        orderBy: desc(eventos.criadoEm),
      })
    : [];
  return [...proprios, ...doColab];
}
