import { isNull } from "drizzle-orm";
import { eventos } from "@/db/schema";

/**
 * Filtro do soft delete: eventos excluídos (`excluido_em` preenchido) somem de
 * todas as listagens e acessos. Combine com `and(...)` em toda consulta a
 * `eventos` que alimenta uma tela.
 */
export const naoExcluido = isNull(eventos.excluidoEm);
