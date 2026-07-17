"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { eventoColaboradores, eventos, usuarios } from "@/db/schema";
import { getUsuarioSessao } from "@/lib/auth";

export async function aceitarConvite(token: string) {
  const db = await getDb();
  const usuario = await getUsuarioSessao();
  if (!usuario) {
    redirect(`/entrar?next=${encodeURIComponent(`/organizador/convite/${token}`)}`);
  }

  const convite = await db.query.eventoColaboradores.findFirst({
    where: eq(eventoColaboradores.token, token),
  });
  if (!convite) throw new Error("Convite inválido");

  // dono do evento não precisa aceitar convite
  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, convite.eventoId),
    columns: { id: true, organizadorId: true },
  });
  if (evento && evento.organizadorId === usuario.id) {
    redirect(`/organizador/eventos/${convite.eventoId}`);
  }

  // convite já usado por outra pessoa
  if (
    convite.status === "ativo" &&
    convite.usuarioId &&
    convite.usuarioId !== usuario.id
  ) {
    throw new Error("Este convite já foi utilizado");
  }

  // vincula o convite a esta conta (idempotente)
  await db
    .update(eventoColaboradores)
    .set({ usuarioId: usuario.id, status: "ativo", aceitoEm: new Date() })
    .where(eq(eventoColaboradores.id, convite.id));

  // colaborar exige acesso ao console — promove a organizador se ainda não for
  if (!usuario.ehOrganizador) {
    await db
      .update(usuarios)
      .set({ ehOrganizador: true })
      .where(eq(usuarios.id, usuario.id));
  }

  redirect(`/organizador/eventos/${convite.eventoId}`);
}
