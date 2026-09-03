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
  // graduações acima da preta: a cor sólida é o vermelho que as identifica
  vermelha_preta: "#C62828",
  vermelha_branca: "#C62828",
  vermelha: "#C62828",
};

/**
 * Faixas de duas cores (as corais). O marcador é dividido na diagonal, senão
 * as três graduações acima da preta ficariam idênticas — todas vermelhas.
 */
const FUNDO_BICOLOR: Record<string, string> = {
  vermelha_preta: `linear-gradient(135deg, ${COR_FAIXA.vermelha} 50%, ${COR_FAIXA.preta} 50%)`,
  vermelha_branca: `linear-gradient(135deg, ${COR_FAIXA.vermelha} 50%, ${COR_FAIXA.branca} 50%)`,
};

/** Cor SÓLIDA da faixa — vale para borda, texto e qualquer lugar que não aceite gradiente. */
export function corDaFaixa(faixa: string | null | undefined): string {
  return (faixa && COR_FAIXA[faixa]) || "#C6A15B";
}

/**
 * Preenchimento do marcador: gradiente nas bicolores, cor sólida no resto.
 * Só para `background` — em borda/texto use `corDaFaixa`.
 */
export function fundoDaFaixa(faixa: string | null | undefined): string {
  return (faixa && FUNDO_BICOLOR[faixa]) || corDaFaixa(faixa);
}
