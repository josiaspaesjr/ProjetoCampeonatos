import {
  distribuirBalanceado,
  ordenarCategorias,
  type CategoriaOrdenavel,
} from "@/lib/categorias/distribuicao-areas";
import type { JanelaDia } from "./dias";

/**
 * Encaixe das lutas nas janelas dos dias e verificação de capacidade.
 *
 * Motor puro (sem DB): recebe janelas (segundos desde a meia-noite) e durações,
 * e responde (a) onde cada luta cai no tempo, quebrando entre dias, e (b) se a
 * grade inteira cabe no período dado o nº de áreas. É a base da regra "só gera
 * áreas se as lutas couberem, senão avisa para acrescentar áreas ou dias".
 */

/** uma luta posicionada no tempo pelo encaixe */
export interface ItemEncaixado {
  /** índice do dia (0-based) em que a luta cai */
  diaIndex: number;
  /** dia do calendário "YYYY-MM-DD" */
  data: string;
  /** início da luta, em segundos desde a meia-noite do seu dia */
  inicioSegundos: number;
  /** true quando a luta não coube em nenhuma janela (extrapola o último dia) */
  overflow: boolean;
}

/** ponto no eixo do motor: dia (0-based) + segundos desde a meia-noite desse dia */
export interface Ancora {
  diaIndex: number;
  segundos: number;
}

/** BIG > 86400: ao comparar âncoras, o dia sempre domina os segundos */
const BIG_DIA = 200000;

/** escalar monotônico de uma âncora (para comparar entre dias) */
function escalar(a: Ancora): number {
  return a.diaIndex * BIG_DIA + a.segundos;
}

/** maior de duas âncoras; null conta como "ausente" */
function maxAncora(a: Ancora | null, b: Ancora | null): Ancora | null {
  if (!a) return b;
  if (!b) return a;
  return escalar(a) >= escalar(b) ? a : b;
}

/**
 * Encaixa uma sequência de lutas (durações em segundos, na ordem) nas janelas
 * dos dias. Cada luta é **atômica**: se não cabe no que resta do dia e há um
 * próximo dia, rola inteira para o início do próximo (não parte no meio). Se não
 * há mais dias, fica no último além do horário de término e marca `overflow`
 * (nunca se perde uma luta). Uma luta maior que um dia inteiro também marca
 * `overflow`.
 *
 * Com `inicioAncora`, o cursor começa nesse ponto (nunca antes do início do dia
 * ancorado) em vez de `janelas[0].inicioSegundos` — é o que permite reancorar as
 * lutas pendentes no progresso real (ver `encaixarComProgresso`). Sem o 3º
 * argumento, o comportamento é idêntico ao anterior.
 *
 * Com `pisos[i]` (modo "Por dia"), a luta `i` nunca começa antes daquele ponto:
 * o cursor **salta para a frente** até o piso quando ainda não o alcançou (nunca
 * para trás). É como uma categoria fixada num dia começa na 1ª janela desse dia
 * mesmo que a janela anterior tenha sobrado tempo. Sem `pisos`, idêntico.
 */
export function encaixarItens(
  janelas: JanelaDia[],
  duracoes: number[],
  inicioAncora?: Ancora,
  pisos?: (Ancora | null)[],
): ItemEncaixado[] {
  const resultado: ItemEncaixado[] = [];
  if (!janelas.length) {
    // sem janelas: nada a ancorar — devolve tudo como overflow
    return duracoes.map(() => ({
      diaIndex: 0,
      data: "",
      inicioSegundos: 0,
      overflow: true,
    }));
  }

  let diaIndex = 0;
  let cursor = janelas[0].inicioSegundos;

  if (inicioAncora) {
    diaIndex = Math.min(Math.max(inicioAncora.diaIndex, 0), janelas.length - 1);
    // não começa antes do início do dia ancorado
    cursor = Math.max(inicioAncora.segundos, janelas[diaIndex].inicioSegundos);
    // pula dias cujo fim a âncora já ultrapassou (área atrasada / gap noturno)
    while (
      diaIndex < janelas.length - 1 &&
      cursor >= janelas[diaIndex].fimSegundos
    ) {
      diaIndex++;
      cursor = janelas[diaIndex].inicioSegundos;
    }
  }

  for (let i = 0; i < duracoes.length; i++) {
    const dur = duracoes[i];
    // piso do dia fixado: salta o cursor para a frente até a janela do dia (só
    // se ainda não o alcançou — nunca volta no tempo)
    const piso = pisos?.[i];
    if (piso && escalar({ diaIndex, segundos: cursor }) < escalar(piso)) {
      diaIndex = Math.min(Math.max(piso.diaIndex, 0), janelas.length - 1);
      cursor = Math.max(piso.segundos, janelas[diaIndex].inicioSegundos);
    }
    // rola para o próximo dia enquanto a luta não couber no resto do atual
    while (
      diaIndex < janelas.length - 1 &&
      cursor + dur > janelas[diaIndex].fimSegundos
    ) {
      diaIndex++;
      cursor = janelas[diaIndex].inicioSegundos;
    }
    const janela = janelas[diaIndex];
    const overflow = cursor + dur > janela.fimSegundos;
    resultado.push({
      diaIndex,
      data: janela.data,
      inicioSegundos: cursor,
      overflow,
    });
    cursor += dur;
  }

  return resultado;
}

/** item para o encaixe com progresso real */
export interface ItemProgresso {
  /** duração estimada (s) — usada só enquanto a luta está pendente */
  duracao: number;
  /** término real no eixo do motor quando a luta já encerrou; senão null */
  fimReal: Ancora | null;
  /** piso do dia fixado (modo "Por dia"): a luta pendente não começa antes daqui */
  pisoDia?: Ancora | null;
}

/** slot resultante do encaixe com progresso */
export interface SlotProgresso extends ItemEncaixado {
  /** true quando o horário veio do término real (histórico), não da estimativa */
  real: boolean;
}

/**
 * Encaixa as lutas reancorando pelo progresso **real** da área:
 * - lutas encerradas (`fimReal`) exibem o próprio término real;
 * - as pendentes reancoram a partir de `max(maior término real, agora)` e
 *   empacotam suas durações estimadas nas janelas (regras de `encaixarItens`).
 *
 * Assim, uma luta que termina antes do estimado adianta as seguintes. Sem
 * nenhuma luta encerrada, `piso` é indefinido e o resultado degrada
 * **exatamente** para `encaixarItens` (sem regressão em evento que não começou).
 *
 * `folgaAposRealSeg` é o tempo de organização somado ao término da ÚLTIMA luta
 * encerrada antes de posicionar a 1ª pendente (a próxima luta começa esse tanto
 * depois de a anterior acabar). As pendentes seguintes já carregam esse
 * intervalo na própria duração estimada, então só a fronteira real→pendente
 * precisa somá-lo aqui.
 */
export function encaixarComProgresso(
  janelas: JanelaDia[],
  itens: ItemProgresso[],
  agora: Ancora | null,
  folgaAposRealSeg = 0,
): SlotProgresso[] {
  if (!janelas.length) {
    return itens.map(() => ({
      diaIndex: 0,
      data: "",
      inicioSegundos: 0,
      overflow: true,
      real: false,
    }));
  }

  // "área livre" = maior término real entre as encerradas (max ignora ordem)
  let libre: Ancora | null = null;
  for (const it of itens) {
    if (it.fimReal) libre = maxAncora(libre, it.fimReal);
  }
  // a área só fica livre `folga` s após o término real (organização da próxima
  // luta); encaixarItens rola o dia se isso passar do fim da janela
  const libreLivre: Ancora | null =
    libre && folgaAposRealSeg > 0
      ? { diaIndex: libre.diaIndex, segundos: libre.segundos + folgaAposRealSeg }
      : libre;
  // piso das pendentes; sem nada encerrado, fica indefinido → encaixe estático
  const piso: Ancora | undefined = libreLivre
    ? (maxAncora(libreLivre, agora) ?? undefined)
    : undefined;

  // empacota SÓ as pendentes (subsequência, ordem preservada) a partir do piso
  // global (progresso real); o pisoDia por-luta salta cada categoria fixada para
  // o seu dia.
  const pendentes = itens.filter((it) => it.fimReal === null);
  const encaixePend = encaixarItens(
    janelas,
    pendentes.map((p) => p.duracao),
    piso,
    pendentes.map((p) => p.pisoDia ?? null),
  );

  // costura de volta na ordem original das lutas
  const out: SlotProgresso[] = [];
  let pp = 0;
  for (const it of itens) {
    if (it.fimReal) {
      const diaIndex = Math.min(
        Math.max(it.fimReal.diaIndex, 0),
        janelas.length - 1,
      );
      out.push({
        diaIndex,
        data: janelas[diaIndex].data,
        inicioSegundos: it.fimReal.segundos,
        overflow: false,
        real: true,
      });
    } else {
      out.push({ ...encaixePend[pp++], real: false });
    }
  }
  return out;
}

/** categoria com carga (balanceamento) e demanda real (tempo) para o check */
export interface CatCapacidade extends CategoriaOrdenavel {
  /** carga de balanceamento (com piso de 1 luta) — distribui as áreas */
  carga: number;
  /** demanda real de tempo em segundos (lutas reais × duração, SEM piso) */
  demandaReal: number;
}

/** resultado da verificação: cabe? e, se não, o que sugerir ao organizador */
export interface ResultadoCapacidade {
  cabe: boolean;
  nAreas: number;
  /** demanda da área mais carregada (gargalo), em segundos */
  demandaMaxSegundos: number;
  /** soma da demanda de todas as áreas, em segundos */
  demandaTotalSegundos: number;
  /** janela total de uma área (Σ dias), em segundos — igual para toda área */
  capacidadeAreaSegundos: number;
  /** capacidade somada de todas as áreas (capacidadeArea × nAreas) */
  capacidadeTotalSegundos: number;
  /** maior demanda de uma única categoria, em segundos */
  maiorCategoriaSegundos: number;
  /** true quando 1 categoria sozinha excede a janela — só mais dias/horas resolve */
  soAdicionandoTempo: boolean;
  /** menor nº de áreas (≥ atual, ≤ 40) que faz caber; null se áreas não resolvem */
  areasSugeridas: number | null;
  /** déficit da área mais carregada (quanto falta de tempo por área), em segundos */
  segundosFaltantesPorArea: number;
}

const AREAS_MAX = 40;

/** demanda (segundos) da área mais carregada após distribuir `cats` em `n` áreas */
function gargalo(cats: CatCapacidade[], n: number): number {
  const areas = distribuirBalanceado(cats, n);
  let max = 0;
  for (const area of areas) {
    const soma = area.reduce((s, c) => s + c.demandaReal, 0);
    if (soma > max) max = soma;
  }
  return max;
}

/**
 * Verifica se as lutas estimadas cabem no período. Reusa a mesma ordenação e
 * distribuição balanceada que serão persistidas (`ordenarCategorias` +
 * `distribuirBalanceado`), de modo que o gargalo calculado é o da área mais
 * carregada real. A capacidade de uma área é a soma das janelas de todos os
 * dias (cada área corre em paralelo, atravessando os dias). Categorias sem
 * inscritos somam 0 na demanda (o piso de 1 luta só serve para o balanceamento).
 */
export function verificarCapacidade(
  cats: CatCapacidade[],
  n: number,
  janelas: JanelaDia[],
): ResultadoCapacidade {
  const capacidadeArea = janelas.reduce(
    (s, j) => s + Math.max(0, j.fimSegundos - j.inicioSegundos),
    0,
  );
  const ordenadas = ordenarCategorias(cats);
  const demandaTotal = ordenadas.reduce((s, c) => s + c.demandaReal, 0);
  const maiorCategoria = ordenadas.reduce(
    (m, c) => Math.max(m, c.demandaReal),
    0,
  );
  const gargaloAtual = gargalo(ordenadas, n);
  const cabe = capacidadeArea > 0 && gargaloAtual <= capacidadeArea;

  // uma categoria não parte entre áreas (só entre dias da própria área): se a
  // maior categoria não cabe nem sozinha numa área, mais áreas não resolvem.
  const soAdicionandoTempo = maiorCategoria > capacidadeArea;

  let areasSugeridas: number | null = null;
  if (capacidadeArea > 0 && !soAdicionandoTempo) {
    for (let k = n; k <= AREAS_MAX; k++) {
      if (gargalo(ordenadas, k) <= capacidadeArea) {
        areasSugeridas = k;
        break;
      }
    }
  }

  return {
    cabe,
    nAreas: n,
    demandaMaxSegundos: gargaloAtual,
    demandaTotalSegundos: demandaTotal,
    capacidadeAreaSegundos: capacidadeArea,
    capacidadeTotalSegundos: capacidadeArea * n,
    maiorCategoriaSegundos: maiorCategoria,
    soAdicionandoTempo,
    areasSugeridas,
    segundosFaltantesPorArea: Math.max(0, gargaloAtual - capacidadeArea),
  };
}
