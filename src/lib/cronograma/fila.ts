import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { areas, categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";
import { idsDeBye } from "@/lib/chaves/byes";
import {
  classificarEliminacaoDupla,
  nivelDisputaEliminacaoDupla,
  prioridadeFaseDupla,
} from "@/lib/chaves/eliminacao-dupla";
import { intercalarComDescanso, type UnidadeIntercalavel } from "./intercalar";
import { diasDoEventoOuDefault, type JanelaDia } from "./dias";
import { encaixarComProgresso, type Ancora, type ItemProgresso } from "./janelas";
import { localizarNoEixo, paredeSegundos } from "./relogio";

/**
 * Fila de lutas e cronograma estimado por área.
 *
 * Cada área corre suas categorias em sequência (ordemNaArea); dentro da
 * categoria, as lutas correm por rodada. A estimativa soma a duração
 * regulamentar da faixa + transição, ancorada na hora de início da área
 * (ou agora, se a área já está atrasada).
 */

/**
 * Tempo de "organização" entre lutas (segundos): somado ao tempo regulamentar
 * para estimar quando a próxima luta começa — chamada dos atletas, ajuste do
 * placar etc. É o intervalo que separa o fim de uma luta do início da seguinte.
 */
export const TRANSICAO_SEGUNDOS = 120;

/** tempo regulamentar CBJJ por faixa (kids: aproximação por faixa), em segundos */
export function duracaoLutaSegundos(faixa: string | null): number {
  const minutos =
    {
      cinza: 3,
      amarela: 3,
      laranja: 4,
      verde: 4,
      branca: 5,
      azul: 6,
      roxa: 7,
      marrom: 8,
      preta: 10,
    }[faixa ?? ""] ?? 6;
  return minutos * 60 + TRANSICAO_SEGUNDOS;
}

/**
 * Tempo regulamentar puro da luta (sem a transição) — é o que o cronômetro do
 * placar conta. Usado pelo tablet do organizador e pelo telão da área, para que
 * ambos partam exatamente da mesma base.
 */
export function tempoDeLutaSegundos(faixa: string | null): number {
  return duracaoLutaSegundos(faixa) - TRANSICAO_SEGUNDOS;
}

/**
 * Duração estimada por luta da categoria: o organizador pode definir um valor
 * próprio (equivalente ao "estimated time per match" do scoreboard); nulo cai
 * na tabela regulamentar da faixa.
 */
export function duracaoDaCategoria(categoria: {
  faixa: string | null;
  duracaoLutaSegundos: number | null;
}): number {
  return categoria.duracaoLutaSegundos ?? duracaoLutaSegundos(categoria.faixa);
}

type LutaRow = typeof lutas.$inferSelect;
type CategoriaRow = typeof categorias.$inferSelect;

export interface LutaNaFila {
  luta: LutaRow;
  categoria: CategoriaRow;
  horaEstimada: Date;
  /** pronta = os dois atletas definidos, aguardando só o tatame */
  pronta: boolean;
}

export interface FilaDaArea {
  area: typeof areas.$inferSelect;
  fila: LutaNaFila[];
  atletas: Record<string, { nome: string; academia: string | null }>;
}

/**
 * Slot do encaixe (dia "YYYY-MM-DD" + segundos desde a meia-noite) → Date
 * absoluto. Constrói no mesmo eixo local em que o telão FORMATA a hora
 * (`toLocaleTimeString` sem fuso), então o número exibido é o horário de parede
 * configurado, qualquer que seja o fuso do servidor. Sem data (janelas vazias),
 * cai no próprio "agora".
 */
function slotParaData(
  s: { data: string; inicioSegundos: number },
  agora: Date,
): Date {
  const base = s.data ? new Date(`${s.data}T00:00:00`).getTime() : agora.getTime();
  return new Date(base + s.inicioSegundos * 1000);
}

export async function montarFilaDaArea(
  db: Db,
  areaId: string,
  agora = new Date(),
  /** janelas dos dias (injetadas por montarFilasDoEvento p/ evitar N+1) */
  dias?: JanelaDia[],
): Promise<FilaDaArea | null> {
  const area = await db.query.areas.findFirst({ where: eq(areas.id, areaId) });
  if (!area) return null;

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.areaId, areaId),
    orderBy: asc(categorias.ordemNaArea),
  });

  // janelas dos dias do evento (injetadas por montarFilasDoEvento p/ evitar N+1)
  const janelas =
    dias ??
    (await (async (): Promise<JanelaDia[]> => {
      const evento = await db.query.eventos.findFirst({
        where: eq(eventos.id, area.eventoId),
      });
      return evento ? diasDoEventoOuDefault(db, evento) : [];
    })());
  // piso do dia fixado (modo "Por dia"): data → 1ª janela desse dia (ver janelas.ts)
  const pisoPorData = new Map<string, Ancora>();
  janelas.forEach((j, i) => {
    if (!pisoPorData.has(j.data))
      pisoPorData.set(j.data, { diaIndex: i, segundos: j.inicioSegundos });
  });
  const pisoDaCategoria = (dataFixada: string | null): Ancora | null =>
    dataFixada ? (pisoPorData.get(dataFixada.slice(0, 10)) ?? null) : null;

  // unidades pendentes de cada categoria, na ordem da chave (rodada/nível +
  // fase/posição), já com as tags que a intercalação usa (ver intercalar.ts). A
  // fila ao vivo só mostra as pendentes; as decididas reais entram apenas como
  // ÂNCORA de progresso real (reancoram as pendentes pelo tempo já corrido).
  type UnidadeFila = UnidadeIntercalavel & {
    luta: LutaRow;
    categoria: CategoriaRow;
  };
  const unidades: UnidadeFila[] = [];
  const decididas: ItemProgresso[] = [];
  for (const categoria of cats) {
    const chave = await db.query.chaves.findFirst({
      where: eq(chaves.categoriaId, categoria.id),
    });
    if (!chave || chave.status === "rascunho" || chave.status === "concluida") {
      continue;
    }

    const linhas = await db.query.lutas.findMany({
      where: eq(lutas.chaveId, chave.id),
      orderBy: [asc(lutas.rodada), asc(lutas.posicao)],
    });
    // eliminação dupla: só as lutas reais entram na fila (byes/walkover/mortas
    // não são lutas) e a ordem topológica é o nível de disputa — a rodada crua
    // interleava WB/LB/GF errado (a grande final é guardada como "rodada 1").
    // Demais formatos: geometria de byes + rodada.
    const dupla = chave.formato === "eliminacao_dupla";
    const reais = dupla ? classificarEliminacaoDupla(linhas).reais : null;
    const byes = dupla ? new Set<string>() : idsDeBye(linhas, chave.formato);
    const nivel = dupla ? nivelDisputaEliminacaoDupla(linhas) : null;

    // luta "de fato" (exclui bye/walkover/morta). Decididas viram âncora de
    // progresso; as ainda em aberto entram na fila.
    const ehReal = (luta: LutaRow) =>
      !byes.has(luta.id) && (!reais || reais.has(luta.id));
    for (const luta of linhas) {
      if (!ehReal(luta) || !luta.vencedorInscricaoId) continue;
      decididas.push({
        duracao: 0,
        fimReal: luta.encerradaEm
          ? localizarNoEixo(janelas, paredeSegundos(luta.encerradaEm))
          : null,
        pisoDia: null,
      });
    }
    const pendentes = linhas.filter(
      (luta) => ehReal(luta) && !luta.vencedorInscricaoId,
    );
    // ordem topológica: (nível/rodada, fase, rodada, posição) — bate com a coluna
    // do organizador para os dois motores intercalarem igual.
    const camadaDe = (l: LutaRow) => (nivel ? (nivel.get(l.id) ?? 0) : l.rodada);
    pendentes.sort(
      (p, q) =>
        camadaDe(p) - camadaDe(q) ||
        (dupla ? prioridadeFaseDupla(p.fase) - prioridadeFaseDupla(q.fase) : 0) ||
        p.rodada - q.rodada ||
        p.posicao - q.posicao,
    );
    for (const luta of pendentes) {
      const definida = Boolean(luta.atleta1InscricaoId && luta.atleta2InscricaoId);
      unidades.push({
        luta,
        categoria,
        catId: categoria.id,
        dataFixada: categoria.dataFixada,
        indefinida: !definida,
        separadora: definida,
      });
    }
  }

  // intercala as categorias p/ dar descanso (ninguém luta 2x seguidas quando dá),
  // respeitando os dias — a MESMA ordem-base do cronograma do organizador.
  let ordenadas: UnidadeFila[] = intercalarComDescanso(unidades);

  // ordem manual (drag-and-drop do cronograma): se alguma luta da área tem
  // `ordemCronograma`, a fila segue essa ordem — vence a intercalação. As
  // pendentes sem override (nulls) ficam no fim, preservando a ordem calculada
  // (sort estável).
  if (ordenadas.some((o) => o.luta.ordemCronograma != null))
    ordenadas = [...ordenadas].sort(
      (a, b) =>
        (a.luta.ordemCronograma ?? Infinity) - (b.luta.ordemCronograma ?? Infinity),
    );

  // horários estimados: MESMO motor do cronograma do organizador
  // (encaixarComProgresso) — encaixa nas janelas dos dias reancorando pelo
  // progresso real (uma luta encerrada empurra as pendentes). Sem nada encerrado,
  // parte do início do 1º dia (NÃO do relógio), então a estimativa não pula pro
  // horário atual quando o telão é aberto fora do período do evento.
  const agoraPonto = localizarNoEixo(janelas, paredeSegundos(agora));
  const itens: ItemProgresso[] = [
    ...decididas,
    ...ordenadas.map((o) => ({
      duracao: duracaoDaCategoria(o.categoria),
      fimReal: null,
      pisoDia: pisoDaCategoria(o.categoria.dataFixada),
    })),
  ];
  const encaixe = encaixarComProgresso(
    janelas,
    itens,
    agoraPonto,
    TRANSICAO_SEGUNDOS,
  );
  // as pendentes são a subsequência após as decididas (que só ancoram)
  const horas = encaixe
    .slice(decididas.length)
    .map((s) => slotParaData(s, agora));

  const fila: LutaNaFila[] = ordenadas.map(({ luta, categoria }, i) => ({
    luta,
    categoria,
    horaEstimada: horas[i],
    pronta: Boolean(luta.atleta1InscricaoId && luta.atleta2InscricaoId),
  }));

  const idsInscricoes = [
    ...new Set(
      fila.flatMap((f) =>
        [f.luta.atleta1InscricaoId, f.luta.atleta2InscricaoId].filter(
          (v): v is string => v !== null,
        ),
      ),
    ),
  ];
  const inscritos = idsInscricoes.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, idsInscricoes),
      })
    : [];

  return {
    area,
    fila,
    atletas: Object.fromEntries(
      inscritos.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
    ),
  };
}

export async function montarFilasDoEvento(db: Db, eventoId: string) {
  const [evento, todasAreas] = await Promise.all([
    db.query.eventos.findFirst({ where: eq(eventos.id, eventoId) }),
    db.query.areas.findMany({
      where: eq(areas.eventoId, eventoId),
      orderBy: asc(areas.ordem),
    }),
  ]);
  // carrega as janelas dos dias uma vez e injeta em cada área (evita N+1)
  const dias = evento ? await diasDoEventoOuDefault(db, evento) : [];
  const agora = new Date();
  const filas = await Promise.all(
    todasAreas.map((a) => montarFilaDaArea(db, a.id, agora, dias)),
  );
  return filas.filter((f): f is FilaDaArea => f !== null);
}
