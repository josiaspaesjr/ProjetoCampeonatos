import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { inscricoes } from "@/db/schema";
import { duracaoDaCategoria } from "./fila";

/** carga estimada de uma categoria para equilibrar a distribuição por áreas */
export interface CargaCategoria {
  /** lutas estimadas (≈ confirmados − 1, chave de eliminação simples) */
  lutas: number;
  /** carga em segundos (lutas × duração da faixa), com piso de 1 luta */
  carga: number;
}

type CategoriaCarga = {
  id: string;
  faixa: string | null;
  duracaoLutaSegundos: number | null;
};

/**
 * Estima a carga de cada categoria a partir dos confirmados: `lutas ≈ n − 1`
 * (eliminação simples). Categorias sem inscritos ainda entram com piso de 1
 * luta, para que a distribuição continue equilibrando por contagem (e nenhuma
 * área fique vazia) mesmo antes das inscrições/chaves.
 */
export async function estimarCargaCategorias(
  db: Db,
  eventoId: string,
  cats: CategoriaCarga[],
): Promise<Map<string, CargaCategoria>> {
  const confirmadas = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.eventoId, eventoId),
      eq(inscricoes.status, "confirmada"),
    ),
  });
  const contagem = new Map<string, number>();
  for (const i of confirmadas) {
    contagem.set(i.categoriaId, (contagem.get(i.categoriaId) ?? 0) + 1);
  }

  const carga = new Map<string, CargaCategoria>();
  for (const c of cats) {
    const lutas = Math.max(0, (contagem.get(c.id) ?? 0) - 1);
    carga.set(c.id, {
      lutas,
      carga: Math.max(1, lutas) * duracaoDaCategoria(c),
    });
  }
  return carga;
}
