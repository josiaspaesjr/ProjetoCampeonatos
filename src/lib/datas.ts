/** Formatação de datas do site público (pt-BR, estilo "14 MAR 2026"). */

const MESES = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

function deData(data: string | Date): Date {
  return typeof data === "string" ? new Date(`${data}T12:00:00`) : data;
}

/** "14 MAR" */
export function diaMes(data: string | Date): string {
  const d = deData(data);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]}`;
}

/** { dia: "14", mes: "MAR" } — para o badge de data dos cards */
export function diaMesPartes(data: string | Date): { dia: string; mes: string } {
  const d = deData(data);
  return { dia: String(d.getDate()).padStart(2, "0"), mes: MESES[d.getMonth()] };
}

/** "Sáb · 14 MAR 2026" */
export function dataCompleta(data: string | Date): string {
  const d = deData(data);
  const semana = d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  const cap = semana.charAt(0).toUpperCase() + semana.slice(1);
  return `${cap} · ${diaMes(d)} ${d.getFullYear()}`;
}

/** "14 MAR 2026" */
export function dataCurta(data: string | Date): string {
  const d = deData(data);
  return `${diaMes(d)} ${d.getFullYear()}`;
}

/** "10 MAR 23:59" */
export function dataHora(data: Date): string {
  const h = `${String(data.getHours()).padStart(2, "0")}:${String(
    data.getMinutes(),
  ).padStart(2, "0")}`;
  return `${diaMes(data)} ${h}`;
}
