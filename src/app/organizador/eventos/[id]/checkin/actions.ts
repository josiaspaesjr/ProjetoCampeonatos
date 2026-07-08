"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { auditoria, categorias, eventos, inscricoes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";

async function contexto(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, eventoId), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

export async function registrarCheckin(
  eventoId: string,
  inscricaoId: string,
  formData: FormData,
) {
  const { db, usuario } = await contexto(eventoId);

  const inscricao = await db.query.inscricoes.findFirst({
    where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, eventoId)),
  });
  if (!inscricao) throw new Error("Inscrição não encontrada");
  if (inscricao.status !== "confirmada") {
    throw new Error("Só inscrições confirmadas fazem check-in");
  }

  const peso = Number(String(formData.get("peso") ?? "").replace(",", "."));
  if (!peso || peso <= 0 || peso > 300) throw new Error("Peso inválido");

  const categoria = await db.query.categorias.findFirst({
    where: eq(categorias.id, inscricao.categoriaId),
  });
  const limite = categoria?.limitePesoKg ? Number(categoria.limitePesoKg) : null;
  const foraDoPeso = limite !== null && peso > limite;

  await db
    .update(inscricoes)
    .set({
      checkinEm: new Date(),
      pesoAferidoKg: peso.toFixed(2),
      foraDoPeso,
      atualizadoEm: new Date(),
    })
    .where(eq(inscricoes.id, inscricaoId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricaoId,
    acao: "checkin",
    dadosNovos: { pesoKg: peso, limiteKg: limite, foraDoPeso },
  });

  revalidatePath(`/organizador/eventos/${eventoId}/checkin/${inscricaoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/checkin`);
}

export async function desfazerCheckin(eventoId: string, inscricaoId: string) {
  const { db, usuario } = await contexto(eventoId);
  const inscricao = await db.query.inscricoes.findFirst({
    where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, eventoId)),
  });
  if (!inscricao?.checkinEm) throw new Error("Inscrição sem check-in");

  await db
    .update(inscricoes)
    .set({
      checkinEm: null,
      pesoAferidoKg: null,
      foraDoPeso: false,
      atualizadoEm: new Date(),
    })
    .where(eq(inscricoes.id, inscricaoId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricaoId,
    acao: "checkin_desfeito",
    dadosAnteriores: {
      pesoKg: inscricao.pesoAferidoKg,
      foraDoPeso: inscricao.foraDoPeso,
    },
  });

  revalidatePath(`/organizador/eventos/${eventoId}/checkin/${inscricaoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/checkin`);
}
