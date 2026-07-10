// Regras de preço da inscrição — compartilhadas entre a exibição no formulário
// público (client) e a cobrança na server action, para os dois nunca divergirem.

/** variação de preço nomeada de um lote (ex.: { nome: "Adulto", precoCentavos: 13000 }) */
export type LoteVariacao = { nome: string; precoCentavos: number };

/**
 * Grupos de preço disponíveis (presets fixos). O mesmo conjunto alimenta o
 * select de variação do lote e a marcação de grupo das categorias, garantindo
 * que os nomes batam exatamente entre os dois lados.
 */
export const GRUPOS_PRECO_PRESETS = [
  "Kids",
  "Juvenil",
  "Adulto",
  "Master",
  "Feminino",
  "Masculino",
] as const;

/** preço da variação cujo nome bate com o grupo da categoria; nulo se não houver */
export function precoDoGrupoCentavos(
  variacoes: LoteVariacao[] | null | undefined,
  grupo: string | null | undefined,
): number | null {
  if (!grupo || !variacoes?.length) return null;
  return variacoes.find((v) => v.nome === grupo)?.precoCentavos ?? null;
}

/**
 * Preço final da inscrição, em centavos. Precedência:
 *  1. preço próprio da categoria (entry, ex.: absoluto)
 *  2. desconto de 2ª inscrição do lote, quando habilitado e for 2ª+ inscrição
 *  3. preço do grupo da categoria no lote vigente (kids/adulto/feminino/…)
 *  4. preço base do lote
 * A 2ª inscrição (2) vence o grupo (3): tendo o lote um preço de 2ª inscrição
 * habilitado, ele é garantido para a inscrição adicional do atleta — mesmo que
 * a categoria tenha grupo de preço.
 */
export function precoInscricaoCentavos(args: {
  categoriaPrecoCentavos: number | null;
  grupoPreco: string | null;
  loteVariacoes: LoteVariacao[] | null;
  lotePrecoCentavos: number;
  lotePrecoSegundaCentavos: number | null;
  ehSegundaInscricao: boolean;
}): number {
  if (args.categoriaPrecoCentavos != null) return args.categoriaPrecoCentavos;
  if (args.ehSegundaInscricao && args.lotePrecoSegundaCentavos != null) {
    return args.lotePrecoSegundaCentavos;
  }
  const grupo = precoDoGrupoCentavos(args.loteVariacoes, args.grupoPreco);
  if (grupo != null) return grupo;
  return args.lotePrecoCentavos;
}
