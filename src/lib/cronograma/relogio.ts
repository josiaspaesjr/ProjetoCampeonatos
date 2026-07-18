import type { Ancora } from "./janelas";
import type { JanelaDia } from "./dias";

/**
 * Ponte entre instantes absolutos (Date, ex.: `lutas.encerradaEm` e "agora") e o
 * eixo de "segundos de parede" em que o cronograma trabalha.
 *
 * O motor de cronograma (`janelas.ts`) é fuso-agnóstico: horários são segundos
 * desde a meia-noite, sem fuso. Um `Date` é um instante UTC absoluto — para
 * posicioná-lo nesse eixo precisamos da hora **de parede** num fuso. Fixamos o
 * fuso do Brasil (o sistema é BR-first) usando o NOME da zona, não um offset:
 * assim o resultado é correto mesmo quando o servidor roda em UTC (Vercel).
 */

export const TZ_BR = "America/Sao_Paulo";

/**
 * Date (instante absoluto) → hora de parede no fuso: dia "YYYY-MM-DD" e segundos
 * desde a meia-noite daquele dia. `hourCycle: "h23"` evita o "24" da meia-noite.
 */
export function paredeSegundos(
  date: Date,
  tz: string = TZ_BR,
): { data: string; segundos: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === t)?.value ?? "0";
  const data = `${get("year")}-${get("month")}-${get("day")}`;
  const segundos =
    Number(get("hour")) * 3600 +
    Number(get("minute")) * 60 +
    Number(get("second"));
  return { data, segundos };
}

/**
 * Posiciona uma hora de parede no eixo das janelas (dia + segundos). Casa a data
 * com um dos dias; fora do período, faz clamp no primeiro/último dia — o motor
 * garante que o cursor nunca comece antes do início do dia ancorado.
 */
export function localizarNoEixo(
  janelas: JanelaDia[],
  parede: { data: string; segundos: number },
): Ancora {
  const i = janelas.findIndex((j) => j.data === parede.data);
  if (i >= 0) return { diaIndex: i, segundos: parede.segundos };
  // antes do 1º dia → início do período; depois → último dia
  if (parede.data < janelas[0].data) {
    return { diaIndex: 0, segundos: janelas[0].inicioSegundos };
  }
  return { diaIndex: janelas.length - 1, segundos: parede.segundos };
}
