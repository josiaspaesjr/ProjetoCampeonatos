"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { eventoColaboradores } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { ehDonoDoEvento, eventoGerenciavel } from "@/lib/eventos/acesso";
import { permissoesDoForm } from "@/lib/eventos/permissoes";

/** Só o dono do evento gerencia a equipe (convidar/revogar/permissões). */
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
  const permissoes = permissoesDoForm(formData);
  // convite sem nenhuma seção não daria acesso a nada
  if (permissoes.length === 0) return;

  await db.insert(eventoColaboradores).values({
    eventoId,
    email,
    token: randomUUID(),
    status: "pendente",
    permissoes,
    convidadoPor: usuario.id,
  });
  revalidatePath(`/organizador/eventos/${eventoId}/equipe`);
}

/** Troca o que um colaborador (ou convite pendente) pode acessar. */
export async function atualizarPermissoes(
  eventoId: string,
  colaboradorId: string,
  formData: FormData,
) {
  const { db } = await exigirDono(eventoId);
  const permissoes = permissoesDoForm(formData);
  if (permissoes.length === 0) return;

  await db
    .update(eventoColaboradores)
    .set({ permissoes })
    .where(
      and(
        eq(eventoColaboradores.id, colaboradorId),
        eq(eventoColaboradores.eventoId, eventoId),
      ),
    );
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
