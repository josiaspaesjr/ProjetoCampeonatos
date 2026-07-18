"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { areas, auditoria, categorias, eventos, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import {
  distribuirBalanceado,
  ordenarCategorias,
} from "@/lib/categorias/distribuicao-areas";
import { estimarCargaCategorias } from "@/lib/cronograma/carga-areas";
import {
  diasDoEventoOuDefault,
  formatarDuracaoSegundos,
} from "@/lib/cronograma/dias";
import { duracaoDaCategoria } from "@/lib/cronograma/fila";
import { verificarCapacidade, type ResultadoCapacidade } from "@/lib/cronograma/janelas";
import {
  lerDiasDoForm,
  persistirDiasEvento,
  validarDias,
} from "@/lib/eventos/dias-form";
import { registrarResultadoNoBanco, type PlacarLuta } from "@/lib/chaves/persistencia";
import type { MetodoVitoria } from "@/lib/bracket";

const AREAS_MIN = 1;
const AREAS_MAX = 40;
const pad2 = (n: number) => String(n).padStart(2, "0");

/** erros esperados da tela de Áreas viram banner (redirect com ?erro=) */
function erroVisivelAreas(eventoId: string, mensagem: string): never {
  redirect(
    `/organizador/eventos/${eventoId}/areas?erro=${encodeURIComponent(mensagem)}`,
  );
}

type AvisoAreas = Awaited<ReturnType<typeof getDicionario>>["admin"]["areas"];

/** monta o aviso de "não cabe" com a demanda, a capacidade e a sugestão */
function mensagemNaoCabe(cap: ResultadoCapacidade, ta: AvisoAreas): string {
  const demanda = formatarDuracaoSegundos(cap.demandaMaxSegundos);
  const capac = formatarDuracaoSegundos(cap.capacidadeAreaSegundos);
  const base = `${ta.naoCabePre}${demanda}${ta.naoCabeMeio}${capac}${ta.naoCabePos}`;
  const sugereAreas =
    !cap.soAdicionandoTempo &&
    cap.areasSugeridas != null &&
    cap.areasSugeridas > cap.nAreas;
  const sugestao = sugereAreas
    ? `${ta.naoCabeAreasPre}${cap.areasSugeridas}${ta.naoCabeAreasPos}`
    : ta.naoCabeTempo;
  return base + sugestao;
}

async function contexto(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await eventoGerenciavel(db, eventoId, usuario.id);
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

/**
 * Estrutura as áreas do evento: grava o nº de áreas, concilia as áreas reais
 * (Área 01…0N) e distribui a grade de categorias por elas pelo algoritmo de
 * ondas (extremos → meio). A fila/placar do dia consomem `areaId`/`ordemNaArea`
 * — por isso a alocação é persistida, não só o número.
 */
export async function estruturarAreas(eventoId: string, formData: FormData) {
  const { db, usuario, evento } = await contexto(eventoId);
  const dic = await getDicionario();

  const nAreas = Math.floor(Number(formData.get("numAreas")));
  if (!Number.isFinite(nAreas) || nAreas < AREAS_MIN || nAreas > AREAS_MAX) {
    erroVisivelAreas(eventoId, dic.admin.erros.numAreasInvalido);
  }

  // só leitura até a validação passar — nada é gravado se não couber
  const [cats, existentes, janelas] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
    db.query.areas.findMany({
      where: eq(areas.eventoId, eventoId),
      orderBy: asc(areas.ordem),
    }),
    diasDoEventoOuDefault(db, evento),
  ]);
  if (!cats.length) erroVisivelAreas(eventoId, dic.admin.areas.gereGradeAntes);

  // entradas com carga (balanceamento) e demanda real (tempo) por categoria
  const cargas = await estimarCargaCategorias(db, eventoId, cats);
  const entradas = cats.map((c) => ({
    id: c.id,
    classeIdade: c.classeIdade,
    sexo: c.sexo,
    faixa: c.faixa,
    tipo: c.tipo,
    limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
    carga: cargas.get(c.id)?.carga ?? 1,
    demandaReal: (cargas.get(c.id)?.lutas ?? 0) * duracaoDaCategoria(c),
  }));

  // VERIFICAÇÃO DE ENCAIXE: as lutas cabem no período com N áreas?
  const cap = verificarCapacidade(entradas, nAreas, janelas);
  if (!cap.cabe) {
    // não grava nada — orienta a acrescentar áreas ou dias/horas
    erroVisivelAreas(eventoId, mensagemNaoCabe(cap, dic.admin.areas));
  }

  // --- cabe: a partir daqui, persiste ---
  // nº de áreas planejado (reflete no chip da Visão geral, badge e checklist)
  await db.update(eventos).set({ numAreas: nAreas }).where(eq(eventos.id, eventoId));

  // âncora do cronograma ao vivo de cada área: início do 1º dia
  const dia1 = janelas[0];
  const horaInicio = dia1
    ? new Date(
        new Date(`${dia1.data}T00:00:00`).getTime() + dia1.inicioSegundos * 1000,
      )
    : null;

  // concilia as áreas reais a N — reaproveita as existentes (preserva a
  // intercalação), cria as que faltam, remove as sobrantes
  const alvoIds: string[] = [];
  for (let i = 0; i < nAreas; i++) {
    const existente = existentes[i];
    if (existente) {
      await db
        .update(areas)
        .set({ nome: `Área ${pad2(i + 1)}`, ordem: i, horaInicio })
        .where(eq(areas.id, existente.id));
      alvoIds.push(existente.id);
    } else {
      const [nova] = await db
        .insert(areas)
        .values({ eventoId, nome: `Área ${pad2(i + 1)}`, ordem: i, horaInicio })
        .returning();
      alvoIds.push(nova.id);
    }
  }
  const extras = existentes.slice(nAreas);
  if (extras.length) {
    const idsExtras = extras.map((a) => a.id);
    await db
      .update(categorias)
      .set({ areaId: null, ordemNaArea: null })
      .where(inArray(categorias.areaId, idsExtras));
    await db.delete(areas).where(inArray(areas.id, idsExtras));
  }

  // distribui reusando as MESMAS entradas do check (ordenação/carga idênticas,
  // então a área mais cheia bate com o gargalo que foi validado)
  const ordenadas = ordenarCategorias(entradas);
  const porArea = distribuirBalanceado(ordenadas, nAreas);

  const alocacoes: { id: string; areaId: string; ordem: number }[] = [];
  porArea.forEach((catsDaArea, i) => {
    catsDaArea.forEach((c, ordem) => {
      alocacoes.push({ id: c.id, areaId: alvoIds[i], ordem });
    });
  });
  await Promise.all(
    alocacoes.map((a) =>
      db
        .update(categorias)
        .set({ areaId: a.areaId, ordemNaArea: a.ordem })
        .where(and(eq(categorias.id, a.id), eq(categorias.eventoId, eventoId))),
    ),
  );

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "evento",
    entidadeId: eventoId,
    acao: "areas_estruturadas",
    dadosNovos: { areas: nAreas, categorias: cats.length },
  });

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}

/** salva os dias/horários do evento a partir da tela de Áreas */
export async function salvarDiasEvento(eventoId: string, formData: FormData) {
  const { db } = await contexto(eventoId);
  const dic = await getDicionario();

  const dias = lerDiasDoForm(formData);
  const erro = validarDias(dias);
  if (erro) erroVisivelAreas(eventoId, dic.admin.erros[erro]);

  await persistirDiasEvento(db, eventoId, dias);
  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
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
