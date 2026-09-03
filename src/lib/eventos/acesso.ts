import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { eventoColaboradores, eventos } from "@/db/schema";
import {
  SECOES,
  normalizarPermissoes,
  temAcesso,
  type Secao,
} from "@/lib/eventos/permissoes";

type Evento = typeof eventos.$inferSelect;

export interface AcessoEvento {
  evento: Evento;
  /** dono do evento — tem tudo, inclusive equipe e exclusão */
  ehDono: boolean;
  /** seções liberadas (todas, para o dono) */
  permissoes: Secao[];
}

/**
 * Acesso do usuário ao evento: dono, colaborador ativo, ou nada.
 * Base de `eventoGerenciavel` — use direto quando a tela precisa saber
 * *quais* seções a pessoa tem (ex.: montar a navegação).
 */
export async function acessoAoEvento(
  db: Db,
  eventoId: string,
  usuarioId: string,
): Promise<AcessoEvento | undefined> {
  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, eventoId),
  });
  if (!evento) return undefined;
  if (evento.organizadorId === usuarioId) {
    return { evento, ehDono: true, permissoes: [...SECOES] };
  }
  const colaborador = await db.query.eventoColaboradores.findFirst({
    where: and(
      eq(eventoColaboradores.eventoId, eventoId),
      eq(eventoColaboradores.usuarioId, usuarioId),
      eq(eventoColaboradores.status, "ativo"),
    ),
  });
  if (!colaborador) return undefined;
  return {
    evento,
    ehDono: false,
    permissoes: normalizarPermissoes(colaborador.permissoes),
  };
}

/**
 * Retorna o evento se o usuário pode gerenciá-lo — é o dono
 * (`eventos.organizadorId`) OU um colaborador ativo. Caso contrário, undefined.
 * Substitui o antigo `where organizadorId = usuario.id` nas telas do console.
 *
 * Passe `secao` para exigir também a permissão daquela parte do console: um
 * colaborador de mesa (só chaves e áreas) não abre inscrições nem lotes. Toda
 * página e server action do console passa por aqui, então é o único ponto onde
 * a permissão precisa ser checada.
 */
export async function eventoGerenciavel(
  db: Db,
  eventoId: string,
  usuarioId: string,
  secao?: Secao,
): Promise<Evento | undefined> {
  const acesso = await acessoAoEvento(db, eventoId, usuarioId);
  if (!acesso) return undefined;
  if (secao && !temAcesso(acesso.permissoes, secao)) return undefined;
  return acesso.evento;
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
