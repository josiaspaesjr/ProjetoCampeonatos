"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { eventoColaboradores } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { ehDonoDoEvento, eventoGerenciavel } from "@/lib/eventos/acesso";

/** Só o dono do evento gerencia a equipe (convidar/revogar). */
async function exigirDono(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await eventoGerenciavel(db, eventoId, usuario.id);
  if (!evento || !ehDonoDoEvento(evento, usuario.id)) {
    throw new Error("Apenas o dono do evento pode gerenciar a equipe");
  }
  return { db, usuario };
}

export async function convidarColaborador(eventoId: string, formData: FormData) {
  const { db, usuario } = await exigirDono(eventoId);
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  await db.insert(eventoColaboradores).values({
    eventoId,
    email,
    token: randomUUID(),
    status: "pendente",
    convidadoPor: usuario.id,
  });
  revalidatePath(`/organizador/eventos/${eventoId}/equipe`);
}

/** Remove um colaborador (ativo) ou cancela um convite (pendente). */
export async function revogarColaborador(eventoId: string, colaboradorId: string) {
  const { db } = await exigirDono(eventoId);
  await db
    .delete(eventoColaboradores)
    .where(
      and(
        eq(eventoColaboradores.id, colaboradorId),
        eq(eventoColaboradores.eventoId, eventoId),
      ),
    );
  revalidatePath(`/organizador/eventos/${eventoId}/equipe`);
}
