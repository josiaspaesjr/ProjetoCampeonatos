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

/** (dataA, segA) < (dataB, segB) no eixo absoluto (data domina os segundos) */
function menor(dataA: string, segA: number, dataB: string, segB: number): boolean {
  return dataA !== dataB ? dataA < dataB : segA < segB;
}

/**
 * Posiciona uma hora de parede no eixo das janelas (índice da janela +
 * segundos). Um mesmo dia pode ter várias janelas (manhã/tarde), então não
 * basta casar a data: escolhe a **primeira janela cujo fim ainda não passou**
 * em relação a "agora" —
 * - agora dentro de uma janela → mantém o offset real (segundos de parede);
 * - agora antes dela (dia futuro ou no intervalo) → começa no início da janela,
 *   pulando o tempo livre entre janelas;
 * - agora depois de todas → último dia (o motor trata como overflow).
 *
 * Assim o reajuste ao vivo nunca reancora uma luta pendente no intervalo entre
 * as janelas nem numa janela já encerrada.
 */
export function localizarNoEixo(
  janelas: JanelaDia[],
  parede: { data: string; segundos: number },
): Ancora {
  for (let i = 0; i < janelas.length; i++) {
    const j = janelas[i];
    // primeira janela cujo fim (absoluto) é depois de "agora"
    if (menor(parede.data, parede.segundos, j.data, j.fimSegundos)) {
      // agora antes do início desta janela → ancora no início dela
      if (!menor(j.data, j.inicioSegundos, parede.data, parede.segundos)) {
        return { diaIndex: i, segundos: j.inicioSegundos };
      }
      // agora dentro desta janela → preserva o offset real
      return { diaIndex: i, segundos: parede.segundos };
    }
  }
  // depois de todas as janelas → último dia
  return { diaIndex: janelas.length - 1, segundos: parede.segundos };
}
