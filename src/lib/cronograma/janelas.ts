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

/**
 * Encaixa uma sequência de lutas (durações em segundos, na ordem) nas janelas
 * dos dias. Cada luta é **atômica**: se não cabe no que resta do dia e há um
 * próximo dia, rola inteira para o início do próximo (não parte no meio). Se não
 * há mais dias, fica no último além do horário de término e marca `overflow`
 * (nunca se perde uma luta). Uma luta maior que um dia inteiro também marca
 * `overflow`.
 */
export function encaixarItens(
  janelas: JanelaDia[],
  duracoes: number[],
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

  for (const dur of duracoes) {
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
