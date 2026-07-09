/** Cor do marcador de faixa (losango) nas listas de categorias. */
export const COR_FAIXA: Record<string, string> = {
  branca: "#EDE7DA",
  cinza: "#9CA3AF",
  amarela: "#E5C14E",
  laranja: "#E08A3C",
  verde: "#3F8F5B",
  azul: "#3E7BD6",
  roxa: "#8A5BD6",
  marrom: "#8A5A34",
  preta: "#111111",
};

export function corDaFaixa(faixa: string | null | undefined): string {
  return (faixa && COR_FAIXA[faixa]) || "#C6A15B";
}
