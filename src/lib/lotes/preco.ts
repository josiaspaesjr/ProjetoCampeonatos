// Regras de preço da inscrição — compartilhadas entre a exibição no formulário
// público (client) e a cobrança na server action, para os dois nunca divergirem.

/** variação de preço nomeada de um lote (ex.: { nome: "kids", precoCentavos: 10000 }) */
export type LoteVariacao = { nome: string; precoCentavos: number };

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
 *  2. preço do grupo da categoria no lote vigente (kids/adulto/feminino/…)
 *  3. desconto de 2ª inscrição do lote, quando aplicável
 *  4. preço base do lote
 * (2) vence (3): quando a categoria tem grupo, o preço do grupo manda — o
 * desconto de 2ª inscrição só entra para categorias sem grupo definido.
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
  const grupo = precoDoGrupoCentavos(args.loteVariacoes, args.grupoPreco);
  if (grupo != null) return grupo;
  if (args.ehSegundaInscricao && args.lotePrecoSegundaCentavos != null) {
    return args.lotePrecoSegundaCentavos;
  }
  return args.lotePrecoCentavos;
}

/** nomes de grupo (variações) distintos de um conjunto de lotes, em ordem de aparição */
export function gruposDePreco(
  lotes: { variacoes: LoteVariacao[] | null }[],
): string[] {
  const vistos = new Set<string>();
  for (const l of lotes) {
    for (const v of l.variacoes ?? []) {
      const nome = v.nome.trim();
      if (nome) vistos.add(nome);
    }
  }
  return [...vistos];
}
