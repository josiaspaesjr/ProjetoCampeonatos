"use server";

import { ilike, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { academias } from "@/db/schema";

export interface AcademiaOpcao {
  id: string;
  nome: string;
}

/**
 * Busca academias do catálogo (base IBJJF) por trecho do nome, para o
 * seletor da inscrição. Ordena prefixos primeiro e limita o resultado —
 * o atleta escolhe uma opção existente, não cadastra academia nova.
 */
export async function buscarAcademias(termo: string): Promise<AcademiaOpcao[]> {
  const q = termo.trim();
  if (q.length < 2) return [];

  // escapa curingas de LIKE para que o texto do usuário seja tratado literal
  const literal = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const db = await getDb();

  return db
    .select({ id: academias.id, nome: academias.nome })
    .from(academias)
    .where(ilike(academias.nome, `%${literal}%`))
    // quem começa com o termo aparece antes; depois ordem alfabética
    .orderBy(sql`(${academias.nome} ilike ${`${literal}%`}) desc`, academias.nome)
    .limit(30);
}
