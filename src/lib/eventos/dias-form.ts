import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { eventoDias, eventos } from "@/db/schema";
import { hhmmParaMinutos } from "@/lib/cronograma/dias";

/**
 * Leitura/validação/persistência dos dias do evento a partir do formulário.
 *
 * Cada linha é uma **janela** de horário (`diaData[]`, `diaInicio[]`,
 * `diaFim[]`, arrays paralelos no FormData — o mesmo padrão dos pacotes de
 * preço dos lotes). Um dia de calendário pode ter mais de uma janela (manhã e
 * tarde), e o intervalo entre elas fica livre de lutas. Compartilhado entre o
 * cadastro/edição do evento e a tela de Áreas, para a regra ser única.
 */

export interface DiaForm {
  /** "YYYY-MM-DD" */
  data: string;
  inicioMinutos: number;
  fimMinutos: number;
}

/**
 * Lê as janelas de dias do FormData, ordenadas por (data, início). Mantém
 * várias janelas no mesmo dia (manhã/tarde) — não deduplica por data.
 */
export function lerDiasDoForm(formData: FormData): DiaForm[] {
  const datas = formData.getAll("diaData").map(String);
  const inicios = formData.getAll("diaInicio").map(String);
  const fins = formData.getAll("diaFim").map(String);

  const dias: DiaForm[] = [];
  for (let i = 0; i < datas.length; i++) {
    const data = datas[i]?.trim();
    if (!data) continue; // linha em branco
    dias.push({
      data,
      inicioMinutos: hhmmParaMinutos(inicios[i] ?? "09:00"),
      fimMinutos: hhmmParaMinutos(fins[i] ?? "18:00"),
    });
  }

  // ordena por data e, no mesmo dia, por horário de início (manhã antes da
  // tarde) — é a ordem em que o cronograma encaixa as lutas.
  return dias.sort(
    (a, b) => a.data.localeCompare(b.data) || a.inicioMinutos - b.inicioMinutos,
  );
}

/** valida os dias; devolve a chave de erro i18n (admin.erros) ou null se ok */
export function validarDias(
  dias: DiaForm[],
): "diasObrigatorio" | "diaJanelaInvalida" | "diaJanelaSobreposta" | null {
  if (!dias.length) return "diasObrigatorio";
  for (const d of dias) {
    if (!d.data || d.fimMinutos <= d.inicioMinutos) return "diaJanelaInvalida";
  }
  // janelas do mesmo dia não podem se sobrepor (nem tocar): o fim de uma tem
  // de ser <= o início da seguinte. `dias` já vem ordenado por (data, início).
  const ordenados = [...dias].sort(
    (a, b) => a.data.localeCompare(b.data) || a.inicioMinutos - b.inicioMinutos,
  );
  for (let i = 1; i < ordenados.length; i++) {
    const prev = ordenados[i - 1];
    const cur = ordenados[i];
    if (cur.data === prev.data && cur.inicioMinutos < prev.fimMinutos) {
      return "diaJanelaSobreposta";
    }
  }
  return null;
}

/**
 * Substitui os dias do evento (delete + insert) e deriva `dataInicio`/`dataFim`
 * do evento (min/max das datas) — mantém a data do evento coerente com os dias.
 */
export async function persistirDiasEvento(
  db: Db,
  eventoId: string,
  dias: DiaForm[],
) {
  await db.delete(eventoDias).where(eq(eventoDias.eventoId, eventoId));
  if (!dias.length) return;
  await db.insert(eventoDias).values(
    dias.map((d, i) => ({
      eventoId,
      data: d.data,
      inicioMinutos: d.inicioMinutos,
      fimMinutos: d.fimMinutos,
      ordem: i,
    })),
  );
  await db
    .update(eventos)
    .set({ dataInicio: dias[0].data, dataFim: dias[dias.length - 1].data })
    .where(eq(eventos.id, eventoId));
}
