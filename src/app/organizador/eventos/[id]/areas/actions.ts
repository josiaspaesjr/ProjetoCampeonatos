"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { areas, categorias, eventos, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { registrarResultadoNoBanco, type PlacarLuta } from "@/lib/chaves/persistencia";
import type { MetodoVitoria } from "@/lib/bracket";

async function contexto(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, eventoId), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

function recarregar(eventoId: string) {
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}

export async function criarArea(eventoId: string, formData: FormData) {
  const { db } = await contexto(eventoId);
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Dê um nome à área (ex.: Área 1)");

  const existentes = await db.query.areas.findMany({
    where: eq(areas.eventoId, eventoId),
  });
  const horaInicio = formData.get("horaInicio")
    ? new Date(String(formData.get("horaInicio")))
    : null;

  await db.insert(areas).values({
    eventoId,
    nome,
    ordem: existentes.length,
    horaInicio,
  });
  recarregar(eventoId);
}

export async function excluirArea(eventoId: string, areaId: string) {
  const { db } = await contexto(eventoId);
  await db
    .update(categorias)
    .set({ areaId: null, ordemNaArea: null })
    .where(eq(categorias.areaId, areaId));
  await db
    .delete(areas)
    .where(and(eq(areas.id, areaId), eq(areas.eventoId, eventoId)));
  recarregar(eventoId);
}

export async function designarCategoria(eventoId: string, formData: FormData) {
  const { db } = await contexto(eventoId);
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const areaId = String(formData.get("areaId") ?? "");

  const [categoria, area] = await Promise.all([
    db.query.categorias.findFirst({
      where: and(eq(categorias.id, categoriaId), eq(categorias.eventoId, eventoId)),
    }),
    db.query.areas.findFirst({
      where: and(eq(areas.id, areaId), eq(areas.eventoId, eventoId)),
    }),
  ]);
  if (!categoria || !area) throw new Error("Categoria ou área inválida");

  const naArea = await db.query.categorias.findMany({
    where: eq(categorias.areaId, areaId),
    orderBy: asc(categorias.ordemNaArea),
  });
  await db
    .update(categorias)
    .set({ areaId, ordemNaArea: (naArea.at(-1)?.ordemNaArea ?? -1) + 1 })
    .where(eq(categorias.id, categoriaId));
  recarregar(eventoId);
}

export async function removerCategoriaDaArea(eventoId: string, categoriaId: string) {
  const { db } = await contexto(eventoId);
  await db
    .update(categorias)
    .set({ areaId: null, ordemNaArea: null })
    .where(and(eq(categorias.id, categoriaId), eq(categorias.eventoId, eventoId)));
  recarregar(eventoId);
}

/** persiste o placar parcial para o público acompanhar (não decide a luta) */
export async function salvarPlacarParcial(
  eventoId: string,
  lutaId: string,
  placar: PlacarLuta,
) {
  const { db } = await contexto(eventoId);
  const luta = await db.query.lutas.findFirst({ where: eq(lutas.id, lutaId) });
  if (!luta || luta.vencedorInscricaoId) return; // luta já decidida: ignora

  await db
    .update(lutas)
    .set({
      pontos1: placar.pontos1 ?? 0,
      vantagens1: placar.vantagens1 ?? 0,
      punicoes1: placar.punicoes1 ?? 0,
      pontos2: placar.pontos2 ?? 0,
      vantagens2: placar.vantagens2 ?? 0,
      punicoes2: placar.punicoes2 ?? 0,
    })
    .where(eq(lutas.id, lutaId));
}

/** encerra a luta a partir do placar do tablet — mesmo caminho do motor */
export async function encerrarLutaDoPlacar(
  eventoId: string,
  chaveId: string,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
  placar: PlacarLuta,
) {
  const { db } = await contexto(eventoId);
  await registrarResultadoNoBanco(db, chaveId, lutaId, vencedorId, metodo, placar);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}
