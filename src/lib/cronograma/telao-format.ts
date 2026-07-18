/** Formatação compartilhada entre o telão geral e o placar ao vivo por área. */

/** "09:12" a partir de um Date (horário do runtime) */
export const hora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** último(s) segmento(s) do nome da categoria ("… / Preta / Pena" → "Preta Pena") */
export const rotuloCat = (nome: string) => nome.split(" / ").slice(-2).join(" ");

/** força do placar: pontos dominam, vantagem desempata (líder do tatame) */
export const forca = (p: number, v: number) => p * 1000 + v;

/** "05:00" / "-00:12" a partir de segundos (aceita negativo = overtime) */
export function fmtRelogio(seg: number): string {
  const s = Math.trunc(seg);
  const m = Math.floor(Math.abs(s) / 60);
  const r = Math.abs(s) % 60;
  return `${s < 0 ? "-" : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
