import type { JanelaDia } from "./dias";

/** um dia do rascunho do assistente: data + uma janela de horário */
export interface DiaRascunho {
  /** "YYYY-MM-DD" */
  data: string;
  /** "HH:MM" */
  inicio: string;
  /** "HH:MM" */
  fim: string;
}

/** "HH:MM" → minutos desde a meia-noite (entrada torta → 0) */
function hhmmMinutos(s: string): number {
  const [h, m] = String(s).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** "YYYY-MM-DD" → "dd/mm" */
export function dataLabel(data: string): string {
  const [, mm, dd] = data.slice(0, 10).split("-");
  return dd && mm ? `${dd}/${mm}` : data;
}

/**
 * Janelas (segundos desde a meia-noite) do rascunho, na ordem em que o
 * cronograma as preenche: por data e, no mesmo dia, manhã antes de tarde.
 *
 * É o que permite medir a capacidade no cliente com um período que ainda NÃO
 * foi salvo — o assistente de Áreas recalcula a recomendação a cada tecla.
 * Linhas sem data ficam de fora (dia recém-adicionado, ainda em branco).
 */
export function janelasDoRascunho(dias: DiaRascunho[]): JanelaDia[] {
  return dias
    .filter((d) => d.data)
    .map((d) => ({
      data: d.data,
      inicioSegundos: hhmmMinutos(d.inicio) * 60,
      fimSegundos: hhmmMinutos(d.fim) * 60,
    }))
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.inicioSegundos - b.inicioSegundos,
    );
}

/**
 * Datas distintas do rascunho, em ordem — uma coluna por dia no passo
 * "Categorias por dia". Um dia com manhã e tarde conta uma vez só.
 */
export function diasDistintosDoRascunho(
  dias: DiaRascunho[],
): { data: string; label: string }[] {
  return [...new Set(dias.map((d) => d.data.slice(0, 10)))]
    .filter(Boolean)
    .sort()
    .map((data) => ({ data, label: dataLabel(data) }));
}
