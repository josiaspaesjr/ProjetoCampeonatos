import { precoInscricaoCentavos, type LoteVariacao } from "@/lib/lotes/preco";

/** o que o preço precisa saber de uma categoria */
export interface CategoriaDoPedido {
  id: string;
  nome: string;
  precoCentavos: number | null;
  grupoPreco: string | null;
}

/** o que o preço precisa saber do lote vigente */
export interface LoteDoPedido {
  precoCentavos: number;
  precoSegundaInscricaoCentavos: number | null;
  variacoes: LoteVariacao[] | null;
}

export interface ItemDoPedido {
  categoria: CategoriaDoPedido;
  valorCentavos: number;
}

/**
 * As inscrições que uma submissão do formulário gera, já com o preço de cada
 * uma.
 *
 * O absoluto é sempre um adicional: o atleta escolhe uma categoria de peso e
 * responde se quer o absoluto também. Como o absoluto vem depois da de peso,
 * ele sai **sempre** pelo preço de 2ª inscrição do lote. A de peso só entra
 * como 2ª se o atleta já tinha inscrição neste evento.
 *
 * A precedência dentro de cada item é a de `precoInscricaoCentavos` — um preço
 * próprio da categoria (entry) continua vencendo o desconto de 2ª.
 */
export function montarPedido(args: {
  categoria: CategoriaDoPedido;
  absoluto: CategoriaDoPedido | null;
  lote: LoteDoPedido;
  /** o atleta já tem inscrição paga ou pendente neste evento */
  jaTemInscricao: boolean;
}): ItemDoPedido[] {
  const preco = (cat: CategoriaDoPedido, ehSegundaInscricao: boolean) =>
    precoInscricaoCentavos({
      categoriaPrecoCentavos: cat.precoCentavos,
      grupoPreco: cat.grupoPreco,
      loteVariacoes: args.lote.variacoes,
      lotePrecoCentavos: args.lote.precoCentavos,
      lotePrecoSegundaCentavos: args.lote.precoSegundaInscricaoCentavos,
      ehSegundaInscricao,
    });

  const itens: ItemDoPedido[] = [
    {
      categoria: args.categoria,
      valorCentavos: preco(args.categoria, args.jaTemInscricao),
    },
  ];
  if (args.absoluto) {
    itens.push({
      categoria: args.absoluto,
      valorCentavos: preco(args.absoluto, true),
    });
  }
  return itens;
}
