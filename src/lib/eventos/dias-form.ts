import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { eventoDias, eventos } from "@/db/schema";
import { hhmmParaMinutos } from "@/lib/cronograma/dias";

/**
 * Leitura/validação/persistência dos dias do evento a partir do formulário.
 *
 * Os dias vêm como arrays paralelos no FormData (`diaData[]`, `diaInicio[]`,
 * `diaFim[]`) — o mesmo padrão dos pacotes de preço dos lotes. Compartilhado
 * entre o cadastro/edição do evento e a tela de Áreas, para a regra ser única.
 */

export interface DiaForm {
  /** "YYYY-MM-DD" */
  data: string;
  inicioMinutos: number;
  fimMinutos: number;
}

/** lê as linhas de dias do FormData, ordenadas por data e sem duplicatas */
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

  // um dia do calendário aparece uma vez (casa com o uniqueIndex do banco)
  const vistos = new Set<string>();
  return dias
    .sort((a, b) => a.data.localeCompare(b.data))
    .filter((d) => (vistos.has(d.data) ? false : (vistos.add(d.data), true)));
}

/** valida os dias; devolve a chave de erro i18n (admin.erros) ou null se ok */
export function validarDias(
  dias: DiaForm[],
): "diasObrigatorio" | "diaJanelaInvalida" | null {
  if (!dias.length) return "diasObrigatorio";
  for (const d of dias) {
    if (!d.data || d.fimMinutos <= d.inicioMinutos) return "diaJanelaInvalida";
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
