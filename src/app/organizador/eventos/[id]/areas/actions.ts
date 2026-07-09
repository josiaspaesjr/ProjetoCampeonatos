"use server";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { areas, auditoria, categorias, chaves, eventos, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { duracaoDaCategoria } from "@/lib/cronograma/fila";
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

/**
 * Distribuição automática (o "Distribute" do cronograma): espalha as
 * categorias com chave e sem área entre as áreas, equilibrando a carga por
 * tempo estimado (nº de lutas pendentes × duração regulamentar da faixa),
 * para que as áreas terminem em horários próximos. Greedy LPT: maiores
 * blocos primeiro, cada um na área menos carregada.
 */
export async function distribuirCategorias(eventoId: string) {
  const { db, usuario } = await contexto(eventoId);

  const [todasAreas, cats] = await Promise.all([
    db.query.areas.findMany({
      where: eq(areas.eventoId, eventoId),
      orderBy: asc(areas.ordem),
    }),
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
  ]);
  if (!todasAreas.length || !cats.length) return;

  const chavesDoEvento = await db.query.chaves.findMany({
    where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
  });
  const chavePorCategoria = new Map(chavesDoEvento.map((c) => [c.categoriaId, c]));
  const linhasLutas = chavesDoEvento.length
    ? await db.query.lutas.findMany({
        where: and(
          inArray(lutas.chaveId, chavesDoEvento.map((c) => c.id)),
          isNull(lutas.vencedorInscricaoId), // byes já têm vencedor — ficam de fora
        ),
      })
    : [];
  const pendentesPorChave = new Map<string, number>();
  for (const l of linhasLutas) {
    pendentesPorChave.set(l.chaveId, (pendentesPorChave.get(l.chaveId) ?? 0) + 1);
  }

  const pesoSegundos = (c: (typeof cats)[number]): number => {
    const chave = chavePorCategoria.get(c.id);
    if (!chave) return 0;
    return (pendentesPorChave.get(chave.id) ?? 0) * duracaoDaCategoria(c);
  };

  // carga atual de cada área (categorias já designadas)
  const carga = new Map(todasAreas.map((a) => [a.id, 0]));
  const proximaOrdem = new Map(todasAreas.map((a) => [a.id, 0]));
  for (const c of cats) {
    if (!c.areaId || !carga.has(c.areaId)) continue;
    carga.set(c.areaId, carga.get(c.areaId)! + pesoSegundos(c));
    proximaOrdem.set(
      c.areaId,
      Math.max(proximaOrdem.get(c.areaId)!, (c.ordemNaArea ?? -1) + 1),
    );
  }

  const pendentes = cats
    .filter((c) => !c.areaId && chavePorCategoria.has(c.id) && pesoSegundos(c) > 0)
    .sort((a, b) => pesoSegundos(b) - pesoSegundos(a));
  if (!pendentes.length) return;

  for (const categoria of pendentes) {
    const alvo = todasAreas.reduce((menor, a) =>
      carga.get(a.id)! < carga.get(menor.id)! ? a : menor,
    );
    await db
      .update(categorias)
      .set({ areaId: alvo.id, ordemNaArea: proximaOrdem.get(alvo.id)! })
      .where(eq(categorias.id, categoria.id));
    carga.set(alvo.id, carga.get(alvo.id)! + pesoSegundos(categoria));
    proximaOrdem.set(alvo.id, proximaOrdem.get(alvo.id)! + 1);
  }

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "evento",
    entidadeId: eventoId,
    acao: "categorias_distribuidas",
    dadosNovos: { total: pendentes.length },
  });
  recarregar(eventoId);
}

/**
 * Liga/desliga o "slice" da área: com intercalação, a fila alterna as rodadas
 * das categorias (1ª de todas, 2ª de todas…), dando descanso aos atletas
 * entre as próprias lutas.
 */
export async function alternarIntercalarRodadas(eventoId: string, areaId: string) {
  const { db } = await contexto(eventoId);
  const area = await db.query.areas.findFirst({
    where: and(eq(areas.id, areaId), eq(areas.eventoId, eventoId)),
  });
  if (!area) throw new Error("Área não encontrada");
  await db
    .update(areas)
    .set({ intercalarRodadas: !area.intercalarRodadas })
    .where(eq(areas.id, areaId));
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
