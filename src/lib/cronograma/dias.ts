import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { eventoDias } from "@/db/schema";

/**
 * Dias do evento e suas janelas de horário.
 *
 * Cada dia tem uma janela (início/fim). O período total disponível é a soma das
 * janelas de todos os dias — é contra isso que o gerador de áreas verifica se
 * as lutas cabem, e é isso que o cronograma usa para encaixar as lutas dia a
 * dia. Internamente tudo trabalha em **segundos desde a meia-noite** (como o
 * resto do cronograma), sem fuso horário.
 */

/** janela de um dia do evento, em segundos desde a meia-noite */
export interface JanelaDia {
  /** dia do calendário "YYYY-MM-DD" */
  data: string;
  inicioSegundos: number;
  fimSegundos: number;
}

/** linha crua de `evento_dias` que interessa ao cálculo */
export interface DiaRow {
  data: string;
  inicioMinutos: number;
  fimMinutos: number;
  ordem: number;
}

/** início padrão do dia (09:00) quando o evento não tem dias configurados */
export const DEFAULT_INICIO_MIN = 9 * 60;
/** fim padrão (23:59): dia "aberto", não impõe teto — mantém o comportamento antigo */
export const DEFAULT_FIM_MIN = 23 * 60 + 59;

/** "09:00" → minutos desde a meia-noite (540); entrada inválida → 0 */
export function hhmmParaMinutos(hhmm: string): number {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/** minutos desde a meia-noite → "09:00" */
export function minutosParaHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** segundos → duração legível: "8h", "8h30" ou "45min" (para avisos) */
export function formatarDuracaoSegundos(seg: number): string {
  const totalMin = Math.round(seg / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

/**
 * Normaliza as linhas de `evento_dias` em janelas (segundos desde a meia-noite),
 * ordenadas por data. Quando o evento não tem dias configurados, devolve um
 * único dia "aberto" ancorado na data de início (09:00–23:59): o cronograma
 * continua idêntico ao comportamento anterior e o gerador de áreas não bloqueia
 * eventos que nunca configuraram o período.
 */
export function normalizarDias(
  rows: DiaRow[],
  evento: { dataInicio: string },
): JanelaDia[] {
  if (!rows.length) {
    return [
      {
        data: evento.dataInicio,
        inicioSegundos: DEFAULT_INICIO_MIN * 60,
        fimSegundos: DEFAULT_FIM_MIN * 60,
      },
    ];
  }
  return [...rows]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((d) => ({
      data: d.data,
      inicioSegundos: d.inicioMinutos * 60,
      fimSegundos: d.fimMinutos * 60,
    }));
}

/** carrega as janelas dos dias do evento (ou o dia default, se não houver) */
export async function diasDoEventoOuDefault(
  db: Db,
  evento: { id: string; dataInicio: string },
): Promise<JanelaDia[]> {
  const rows = await db.query.eventoDias.findMany({
    where: eq(eventoDias.eventoId, evento.id),
    orderBy: asc(eventoDias.data),
  });
  return normalizarDias(rows, evento);
}
