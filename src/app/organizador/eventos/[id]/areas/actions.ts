"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, type Db } from "@/db";
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

/** horário absoluto do início do 1º dia (âncora do cronograma ao vivo) */
function horaInicioDoDia1(dia1?: { data: string; inicioSegundos: number }) {
  return dia1
    ? new Date(
        new Date(`${dia1.data}T00:00:00`).getTime() + dia1.inicioSegundos * 1000,
      )
    : null;
}

/**
 * Concilia as áreas reais a N: reaproveita as existentes (preserva a
 * intercalação), cria as que faltam e remove as sobrantes (limpando as
 * categorias que estavam nelas). Devolve os ids na ordem. Compartilhado pelos
 * dois modos de estruturar (automático e por dia).
 */
async function conciliarAreas(
  db: Db,
  eventoId: string,
  existentes: { id: string }[],
  nAreas: number,
  horaInicio: Date | null,
): Promise<string[]> {
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
      .set({ areaId: null, ordemNaArea: null, dataFixada: null })
      .where(inArray(categorias.areaId, idsExtras));
    await db.delete(areas).where(inArray(areas.id, idsExtras));
  }
  return alvoIds;
}

/** filtro de um dia no modo "Por dia": classe·sexo·faixa (+ absoluto) → dia */
interface FiltroDia {
  /** "YYYY-MM-DD" */
  data: string;
  classes: string[];
  sexos: string[];
  faixas: string[];
  /** inclui as categorias de absoluto que casam classe·sexo·faixa */
  absoluto: boolean;
}

/** a categoria casa o filtro do dia? (faixa nula = agnóstica de faixa) */
function categoriaCasaFiltro(
  c: { classeIdade: string; sexo: string; faixa: string | null; tipo: string },
  f: FiltroDia,
): boolean {
  if (!f.classes.includes(c.classeIdade)) return false;
  if (!f.sexos.includes(c.sexo)) return false;
  if (c.faixa && !f.faixas.includes(c.faixa)) return false;
  if (c.tipo === "absoluto" && !f.absoluto) return false;
  return true;
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
  const horaInicio = horaInicioDoDia1(janelas[0]);
  const alvoIds = await conciliarAreas(db, eventoId, existentes, nAreas, horaInicio);

  // distribui reusando as MESMAS entradas do check (ordenação/carga idênticas,
  // então a área mais cheia bate com o gargalo que foi validado)
  const ordenadas = ordenarCategorias(entradas);
  const porArea = distribuirBalanceado(ordenadas, nAreas);

  // modo automático: zera `dataFixada` (o encaixe volta a decidir o dia)
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
        .set({ areaId: a.areaId, ordemNaArea: a.ordem, dataFixada: null })
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

/**
 * Estrutura as áreas no modo **Por dia**: o organizador informa, por dia, um
 * filtro (classe·sexo·faixa, + absoluto), e cada categoria é FIXADA no primeiro
 * dia cujo filtro a inclui (`dataFixada`). Dentro de cada dia as categorias são
 * distribuídas entre as N áreas (mesmo balanceamento do automático), e a ordem
 * dentro da área preserva dia1 antes de dia2. As categorias que nenhum filtro
 * pega ficam sem dia/área (não entram no cronograma). Diferente do automático,
 * NÃO bloqueia por capacidade — se um dia estoura, o cronograma mostra as lutas
 * passando do horário (é escolha manual do organizador).
 */
export async function estruturarPorDia(eventoId: string, formData: FormData) {
  const { db, usuario, evento } = await contexto(eventoId);
  const dic = await getDicionario();

  const nAreas = Math.floor(Number(formData.get("numAreas")));
  if (!Number.isFinite(nAreas) || nAreas < AREAS_MIN || nAreas > AREAS_MAX) {
    erroVisivelAreas(eventoId, dic.admin.erros.numAreasInvalido);
  }

  // filtros por dia (JSON): [{ data, classes[], sexos[], faixas[], absoluto }]
  let filtros: FiltroDia[] = [];
  try {
    const raw = formData.get("atribuicoes");
    const parsed = raw ? JSON.parse(String(raw)) : [];
    if (Array.isArray(parsed)) filtros = parsed as FiltroDia[];
  } catch {
    filtros = [];
  }
  // só dias com ao menos uma dimensão marcada valem
  filtros = filtros.filter(
    (f) => f?.data && f.classes?.length && f.sexos?.length && f.faixas?.length,
  );
  if (!filtros.length) {
    erroVisivelAreas(eventoId, dic.admin.areas.porDiaSemFiltro);
  }

  const [cats, existentes, janelas] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
    db.query.areas.findMany({
      where: eq(areas.eventoId, eventoId),
      orderBy: asc(areas.ordem),
    }),
    diasDoEventoOuDefault(db, evento),
  ]);
  if (!cats.length) erroVisivelAreas(eventoId, dic.admin.areas.gereGradeAntes);

  // cargas para o balanceamento (mesma base do automático)
  const cargas = await estimarCargaCategorias(db, eventoId, cats);
  const entradaDe = (c: (typeof cats)[number]) => ({
    id: c.id,
    classeIdade: c.classeIdade,
    sexo: c.sexo,
    faixa: c.faixa,
    tipo: c.tipo,
    limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
    carga: cargas.get(c.id)?.carga ?? 1,
  });

  // dia de cada categoria = 1º filtro cuja regra a inclui
  const diaDeCat = new Map<string, string>();
  for (const c of cats) {
    const f = filtros.find((f) => categoriaCasaFiltro(c, f));
    if (f) diaDeCat.set(c.id, f.data.slice(0, 10));
  }

  // reconcilia N áreas
  const horaInicio = horaInicioDoDia1(janelas[0]);
  const alvoIds = await conciliarAreas(db, eventoId, existentes, nAreas, horaInicio);

  // distribui POR DIA (na ordem das datas), acumulando a ordem dentro de cada
  // área para manter dia1 antes de dia2 na mesma área
  const datasOrdenadas = [...new Set([...diaDeCat.values()])].sort();
  const ordemPorArea = new Array<number>(alvoIds.length).fill(0);
  const alocacoes: { id: string; areaId: string; ordem: number; data: string }[] = [];
  for (const data of datasOrdenadas) {
    const doDia = cats.filter((c) => diaDeCat.get(c.id) === data).map(entradaDe);
    const porArea = distribuirBalanceado(ordenarCategorias(doDia), nAreas);
    porArea.forEach((catsDaArea, i) => {
      for (const c of catsDaArea) {
        alocacoes.push({ id: c.id, areaId: alvoIds[i], ordem: ordemPorArea[i]++, data });
      }
    });
  }

  // aplica: atribuídas → área/ordem/dataFixada; as demais → limpa
  const atribuidas = new Set(alocacoes.map((a) => a.id));
  await Promise.all([
    ...alocacoes.map((a) =>
      db
        .update(categorias)
        .set({ areaId: a.areaId, ordemNaArea: a.ordem, dataFixada: a.data })
        .where(and(eq(categorias.id, a.id), eq(categorias.eventoId, eventoId))),
    ),
    ...cats
      .filter((c) => !atribuidas.has(c.id))
      .map((c) =>
        db
          .update(categorias)
          .set({ areaId: null, ordemNaArea: null, dataFixada: null })
          .where(eq(categorias.id, c.id)),
      ),
  ]);

  await db.update(eventos).set({ numAreas: nAreas }).where(eq(eventos.id, eventoId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "evento",
    entidadeId: eventoId,
    acao: "areas_por_dia",
    dadosNovos: {
      areas: nAreas,
      atribuidas: atribuidas.size,
      dias: datasOrdenadas.length,
    },
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

/**
 * Persiste o estado do cronômetro da luta corrente para o telão/placar público
 * espelhar. Chamado pelo tablet SÓ nos eventos de controle (iniciar/pausar/
 * zerar/encerrar) — nunca a cada segundo. `restanteSeg` pode ser negativo
 * (overtime). Luta já decidida é ignorada.
 */
export async function salvarCronometro(
  eventoId: string,
  lutaId: string,
  c: { restanteSeg: number; rodando: boolean },
) {
  const { db } = await contexto(eventoId);
  const luta = await db.query.lutas.findFirst({ where: eq(lutas.id, lutaId) });
  if (!luta || luta.vencedorInscricaoId) return;

  await db
    .update(lutas)
    .set({
      cronometroRestanteSeg: Math.round(c.restanteSeg),
      cronometroRodando: c.rodando,
      cronometroAtualizadoEm: new Date(),
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
