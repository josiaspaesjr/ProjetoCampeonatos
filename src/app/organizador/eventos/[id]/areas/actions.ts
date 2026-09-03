"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, type Db } from "@/db";
import {
  areas,
  auditoria,
  categorias,
  chaves,
  eventos,
  lutas,
} from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import {
  classesEmOrdem,
  distribuirBalanceado,
  ordenarCategorias,
} from "@/lib/categorias/distribuicao-areas";
import { CLASSES_IDADE } from "@/lib/categorias/cbjj";
import { estimarCargaCategorias } from "@/lib/cronograma/carga-areas";
import {
  diasDoEventoOuDefault,
  formatarDuracaoSegundos,
} from "@/lib/cronograma/dias";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import { duracaoDaCategoria } from "@/lib/cronograma/fila";
import { CHAVES_TEMPO, normalizarTempos } from "@/lib/cronograma/tempos";
import {
  verificarCapacidade,
  type ResultadoCapacidade,
} from "@/lib/cronograma/janelas";
import {
  lerDiasDoForm,
  persistirDiasEvento,
  validarDias,
} from "@/lib/eventos/dias-form";
import {
  registrarResultadoNoBanco,
  type PlacarLuta,
} from "@/lib/chaves/persistencia";
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
  const evento = await eventoGerenciavel(db, eventoId, usuario.id, "areas");
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

/** horário absoluto do início do 1º dia (âncora do cronograma ao vivo) */
function horaInicioDoDia1(dia1?: { data: string; inicioSegundos: number }) {
  return dia1
    ? new Date(
        new Date(`${dia1.data}T00:00:00`).getTime() +
          dia1.inicioSegundos * 1000,
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

/**
 * Zera a ordem manual das lutas (drag-and-drop) do evento inteiro. Chamado ao
 * reestruturar as áreas: a re-distribuição de categorias re-organiza os tatames
 * do zero, então a ordem manual anterior deixa de fazer sentido. Sem chaves
 * geradas ainda, é no-op.
 */
async function zerarOrdemManual(db: Db, eventoId: string) {
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
    columns: { id: true },
  });
  if (!cats.length) return;
  const chavesRows = await db.query.chaves.findMany({
    where: inArray(
      chaves.categoriaId,
      cats.map((c) => c.id),
    ),
    columns: { id: true },
  });
  if (!chavesRows.length) return;
  await db
    .update(lutas)
    .set({ ordemCronograma: null })
    .where(
      inArray(
        lutas.chaveId,
        chavesRows.map((c) => c.id),
      ),
    );
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
  const cargas = await estimarCargaCategorias(
    db,
    eventoId,
    cats,
    evento.temposLuta,
  );
  const entradas = cats.map((c) => ({
    id: c.id,
    classeIdade: c.classeIdade,
    sexo: c.sexo,
    faixa: c.faixa,
    tipo: c.tipo,
    limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
    carga: cargas.get(c.id)?.carga ?? 1,
    demandaReal:
      (cargas.get(c.id)?.lutas ?? 0) * duracaoDaCategoria(c, evento.temposLuta),
  }));

  // VERIFICAÇÃO DE ENCAIXE: as lutas cabem no período com N áreas?
  const cap = verificarCapacidade(
    entradas,
    nAreas,
    janelas,
    evento.ordemClasses,
  );
  if (!cap.cabe) {
    // não grava nada — orienta a acrescentar áreas ou dias/horas
    erroVisivelAreas(eventoId, mensagemNaoCabe(cap, dic.admin.areas));
  }

  // --- cabe: a partir daqui, persiste ---
  // nº de áreas planejado (reflete no chip da Visão geral, badge e checklist)
  await db
    .update(eventos)
    .set({ numAreas: nAreas })
    .where(eq(eventos.id, eventoId));

  // âncora do cronograma ao vivo de cada área: início do 1º dia
  const horaInicio = horaInicioDoDia1(janelas[0]);
  const alvoIds = await conciliarAreas(
    db,
    eventoId,
    existentes,
    nAreas,
    horaInicio,
  );

  // distribui reusando as MESMAS entradas do check (ordenação/carga idênticas,
  // então a área mais cheia bate com o gargalo que foi validado)
  const ordenadas = ordenarCategorias(entradas, evento.ordemClasses);
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

  // re-layout dos tatames descarta a ordem manual de lutas anterior
  await zerarOrdemManual(db, eventoId);

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
  const cargas = await estimarCargaCategorias(
    db,
    eventoId,
    cats,
    evento.temposLuta,
  );
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
  const alvoIds = await conciliarAreas(
    db,
    eventoId,
    existentes,
    nAreas,
    horaInicio,
  );

  // distribui POR DIA (na ordem das datas), acumulando a ordem dentro de cada
  // área para manter dia1 antes de dia2 na mesma área
  const datasOrdenadas = [...new Set([...diaDeCat.values()])].sort();
  const ordemPorArea = new Array<number>(alvoIds.length).fill(0);
  const alocacoes: {
    id: string;
    areaId: string;
    ordem: number;
    data: string;
  }[] = [];
  for (const data of datasOrdenadas) {
    const doDia = cats
      .filter((c) => diaDeCat.get(c.id) === data)
      .map(entradaDe);
    const porArea = distribuirBalanceado(
      ordenarCategorias(doDia, evento.ordemClasses),
      nAreas,
    );
    porArea.forEach((catsDaArea, i) => {
      for (const c of catsDaArea) {
        alocacoes.push({
          id: c.id,
          areaId: alvoIds[i],
          ordem: ordemPorArea[i]++,
          data,
        });
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

  // re-layout dos tatames descarta a ordem manual de lutas anterior
  await zerarOrdemManual(db, eventoId);

  await db
    .update(eventos)
    .set({ numAreas: nAreas })
    .where(eq(eventos.id, eventoId));

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

/**
 * Salva a tabela de tempos do evento (minutos por classe kids / faixa adulto+).
 * Grava só o que difere do padrão CBJJ; campo vazio volta ao padrão. Como o
 * cronograma, a fila do telão e o cronômetro do placar leem a mesma tabela, os
 * horários se recalculam na próxima renderização.
 */
export async function salvarTemposLuta(eventoId: string, formData: FormData) {
  const { db } = await contexto(eventoId);

  const bruto: Record<string, unknown> = {};
  for (const chave of CHAVES_TEMPO) bruto[chave] = formData.get(chave);
  const tempos = normalizarTempos(bruto);

  await db
    .update(eventos)
    .set({ temposLuta: Object.keys(tempos).length ? tempos : null })
    .where(eq(eventos.id, eventoId));

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}

/**
 * Salva a ORDEM DO DIA definida pelo organizador: ids das classes de idade na
 * sequência em que devem correr. Lista vazia (ou só com ids desconhecidos) volta
 * para a regra padrão das ondas (extremos → meio). Vale na próxima vez que as
 * áreas forem estruturadas — não remexe no que já está distribuído.
 */
export async function salvarOrdemClasses(
  eventoId: string,
  classeIds: string[],
) {
  const { db } = await contexto(eventoId);

  const validas = new Set(CLASSES_IDADE.map((c) => c.id));
  const ordem = classeIds.filter(
    (id, i) => validas.has(id) && classeIds.indexOf(id) === i,
  );
  const padrao =
    ordem.length ===
      classesEmOrdem(
        (
          await db.query.categorias.findMany({
            where: eq(categorias.eventoId, eventoId),
            columns: { classeIdade: true },
          })
        ).map((c) => ({ classeIdade: c.classeIdade })),
      ).length && igualAoPadrao(ordem);

  await db
    .update(eventos)
    .set({ ordemClasses: ordem.length && !padrao ? ordem : null })
    .where(eq(eventos.id, eventoId));

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}

/** a sequência escolhida é exatamente a que a regra padrão produziria? */
function igualAoPadrao(ordem: string[]): boolean {
  const padrao = classesEmOrdem(ordem.map((id) => ({ classeIdade: id }))).map(
    (c) => c.id,
  );
  return (
    padrao.length === ordem.length && padrao.every((id, i) => id === ordem[i])
  );
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
  await registrarResultadoNoBanco(
    db,
    chaveId,
    lutaId,
    vencedorId,
    metodo,
    placar,
  );
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}

/**
 * Leva UMA luta para outro tatame (ou de volta para o da categoria) e grava a
 * ordem da área de destino. `lutas.areaId` só diz ONDE a luta corre — a chave
 * (rodada/posição/próxima luta) fica intacta, e a categoria continua morando na
 * área dela com as lutas que sobraram.
 */
export async function moverLutaParaArea(
  eventoId: string,
  lutaId: string,
  areaDestinoId: string,
  /** lutas da área de destino na ordem final (já com a movida no lugar) */
  idsDestinoEmOrdem: string[],
) {
  const { db } = await contexto(eventoId);

  const [luta, areaDestino] = await Promise.all([
    db.query.lutas.findFirst({ where: eq(lutas.id, lutaId) }),
    db.query.areas.findFirst({ where: eq(areas.id, areaDestinoId) }),
  ]);
  if (!luta || !areaDestino || areaDestino.eventoId !== eventoId) return;

  // a luta é mesmo deste evento?
  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.id, luta.chaveId),
  });
  const categoria = chave
    ? await db.query.categorias.findFirst({
        where: eq(categorias.id, chave.categoriaId),
      })
    : null;
  if (!categoria || categoria.eventoId !== eventoId) return;

  // voltou para a área da própria categoria → não precisa de override
  const override = categoria.areaId === areaDestinoId ? null : areaDestinoId;
  await db.update(lutas).set({ areaId: override }).where(eq(lutas.id, lutaId));

  const validos = await idsDeLutasDaArea(
    db,
    eventoId,
    areaDestinoId,
    idsDestinoEmOrdem,
  );
  if (validos.length) await gravarOrdem(db, validos);

  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
  revalidatePath(
    `/organizador/eventos/${eventoId}/areas/${areaDestinoId}/placar`,
  );
  if (luta.areaId && luta.areaId !== areaDestinoId)
    revalidatePath(
      `/organizador/eventos/${eventoId}/areas/${luta.areaId}/placar`,
    );
  if (categoria.areaId && categoria.areaId !== areaDestinoId)
    revalidatePath(
      `/organizador/eventos/${eventoId}/areas/${categoria.areaId}/placar`,
    );
}

/**
 * Leva uma CATEGORIA inteira para outro tatame: ela vai para o fim da área de
 * destino e leva junto todas as suas lutas (limpa overrides de área e de ordem
 * das lutas, então elas entram na ordem-base intercalada do destino).
 */
export async function moverCategoriaParaArea(
  eventoId: string,
  categoriaId: string,
  areaDestinoId: string,
) {
  const { db } = await contexto(eventoId);

  const [categoria, areaDestino] = await Promise.all([
    db.query.categorias.findFirst({ where: eq(categorias.id, categoriaId) }),
    db.query.areas.findFirst({ where: eq(areas.id, areaDestinoId) }),
  ]);
  if (!categoria || categoria.eventoId !== eventoId) return;
  if (!areaDestino || areaDestino.eventoId !== eventoId) return;
  if (categoria.areaId === areaDestinoId) return;

  // entra no fim da fila de categorias do destino
  const noDestino = await db.query.categorias.findMany({
    where: and(
      eq(categorias.eventoId, eventoId),
      eq(categorias.areaId, areaDestinoId),
    ),
    columns: { ordemNaArea: true },
  });
  const proxima =
    noDestino.reduce((m, c) => Math.max(m, c.ordemNaArea ?? 0), 0) + 1;

  await db
    .update(categorias)
    .set({ areaId: areaDestinoId, ordemNaArea: proxima })
    .where(eq(categorias.id, categoriaId));

  // lutas da categoria voltam a seguir a área dela, no fim da ordem do destino
  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  if (chave) {
    await db
      .update(lutas)
      .set({ areaId: null, ordemCronograma: null })
      .where(eq(lutas.chaveId, chave.id));
  }

  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
  revalidatePath(
    `/organizador/eventos/${eventoId}/areas/${areaDestinoId}/placar`,
  );
  if (categoria.areaId)
    revalidatePath(
      `/organizador/eventos/${eventoId}/areas/${categoria.areaId}/placar`,
    );
}

/** ids válidos (lutas que realmente correm na área) preservando a ordem pedida */
async function idsDeLutasDaArea(
  db: Db,
  eventoId: string,
  areaId: string,
  idsPedidos: string[],
): Promise<string[]> {
  if (!idsPedidos.length) return [];
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
    columns: { id: true, areaId: true },
  });
  const areaDaCat = new Map(cats.map((c) => [c.id, c.areaId]));
  const chavesRows = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(
          chaves.categoriaId,
          cats.map((c) => c.id),
        ),
        columns: { id: true, categoriaId: true },
      })
    : [];
  const catDaChave = new Map(chavesRows.map((c) => [c.id, c.categoriaId]));
  const linhas = chavesRows.length
    ? await db.query.lutas.findMany({
        where: inArray(
          lutas.chaveId,
          chavesRows.map((c) => c.id),
        ),
        columns: { id: true, chaveId: true, areaId: true },
      })
    : [];
  const naArea = new Set(
    linhas
      .filter((l) => {
        if (l.areaId) return l.areaId === areaId;
        const catId = catDaChave.get(l.chaveId);
        return catId ? areaDaCat.get(catId) === areaId : false;
      })
      .map((l) => l.id),
  );
  return idsPedidos.filter((id) => naArea.has(id));
}

/** grava `ordemCronograma` = posição, numa única ida ao banco */
async function gravarOrdem(db: Db, idsEmOrdem: string[]) {
  const casos = sql.join(
    idsEmOrdem.map((id, i) => sql`when ${id}::uuid then ${i}::int`),
    sql` `,
  );
  await db
    .update(lutas)
    .set({ ordemCronograma: sql`case ${lutas.id} ${casos} end` })
    .where(inArray(lutas.id, idsEmOrdem));
}

/**
 * Puxa uma luta para ser a PRÓXIMA da área (tela do placar). Reaproveita a
 * ordem manual: grava `ordemCronograma` com a ordem exibida do cronograma, só
 * que com a luta escolhida movida para a primeira posição ainda pendente — as
 * já encerradas ficam onde estão (são âncora de progresso). Como a fila do
 * placar/telão e as colunas do cronograma leem essa mesma ordem, os horários
 * estimados se reajustam sozinhos. A topologia da chave não muda.
 */
export async function definirProximaLuta(
  eventoId: string,
  areaId: string,
  lutaId: string,
) {
  const { db, evento } = await contexto(eventoId);

  const cronograma = await montarCronogramaDoEvento(
    db,
    eventoId,
    evento.dataInicio,
  );
  const area = cronograma.find((a) => a.id === areaId);
  if (!area) return;

  // lutas da área na ordem exibida hoje (mesma lista do editor de arrastar)
  const todas = area.categorias.flatMap((c) => c.lutas);
  const posAtual = todas.findIndex((l) => l.id === lutaId);
  if (posAtual < 0) return;

  // destino = primeira posição ainda não encerrada (o "próxima da fila")
  const primeiroPendente = todas.findIndex((l) => !l.decidida);
  const destino = primeiroPendente < 0 ? todas.length - 1 : primeiroPendente;
  if (posAtual === destino) return;

  const ids = todas.map((l) => l.id);
  const sem = ids.filter((id) => id !== lutaId);
  const insercao = posAtual < destino ? destino - 1 : destino;
  const nova = [...sem.slice(0, insercao), lutaId, ...sem.slice(insercao)];

  // uma única ida ao banco (CASE) — a área pode ter dezenas de lutas e o
  // operador do placar está esperando a troca acontecer
  await gravarOrdem(db, nova);

  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas/${areaId}/placar`);
}

/**
 * Reordena as lutas de uma área conforme o drag-and-drop do cronograma. Grava
 * `ordemCronograma` = posição na lista (0..N) de cada luta; afeta só a exibição
 * e a fila do telão/placar — a topologia da chave (rodada/posição/proximaLuta)
 * fica intacta. Ids que não pertencem à área são ignorados (guarda contra
 * estado velho). Chamada direta pelo editor (não é form action).
 */
export async function reordenarLutasDaArea(
  eventoId: string,
  areaId: string,
  lutaIdsEmOrdem: string[],
) {
  const { db } = await contexto(eventoId);

  // ids válidos = lutas que correm nesta área (inclui as trazidas de outro
  // tatame e exclui as que saíram dela)
  const ordenados = await idsDeLutasDaArea(
    db,
    eventoId,
    areaId,
    lutaIdsEmOrdem,
  );
  if (!ordenados.length) return;

  await gravarOrdem(db, ordenados);

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/organizador/eventos/${eventoId}/areas`);
}
