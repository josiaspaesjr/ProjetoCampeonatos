/** Formatação compartilhada do telão. */

/** "09:12" a partir de um Date (horário do runtime) */
export const hora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** último(s) segmento(s) do nome da categoria ("… / Preta / Pena" → "Preta Pena") */
export const rotuloCat = (nome: string) => nome.split(" / ").slice(-2).join(" ");

/** força do placar: pontos dominam, vantagem desempata (líder do tatame) */
export const forca = (p: number, v: number) => p * 1000 + v;
