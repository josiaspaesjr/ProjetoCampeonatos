import type { Db } from "@/db";
import { pagamentoInscricoes, pagamentos } from "@/db/schema";
import { getGateway } from "@/lib/pagamentos";

export interface ItemInscricaoCobranca {
  inscricaoId: string;
  descricao: string;
  valorCentavos: number;
}

/**
 * Cria uma cobrança Pix para uma ou mais inscrições e persiste o pagamento +
 * vínculos. Retorna o id do pagamento (para redirecionar ao checkout).
 *
 * Ponto único usado tanto na inscrição com "pagar agora" quanto na geração
 * posterior de Pix (pagar depois / cobrança expirada).
 */
export async function criarCobrancaPixParaInscricoes(
  db: Db,
  params: {
    eventoId: string;
    usuarioId: string;
    moeda: string;
    emailPagador: string;
    nomePagador: string;
    itens: ItemInscricaoCobranca[];
  },
): Promise<string> {
  const { eventoId, usuarioId, moeda, emailPagador, nomePagador, itens } = params;
  const valorCentavos = itens.reduce((s, i) => s + i.valorCentavos, 0);

  const gateway = getGateway(moeda);
  const cobranca = await gateway.criarCobrancaPix!({
    eventoId,
    usuarioId,
    emailPagador,
    nomePagador,
    moeda,
    itens,
    descontoCentavos: 0,
    taxaPlataformaCentavos: 0, // monetização: decisão em aberto (spec §7)
  });

  const [pagamento] = await db
    .insert(pagamentos)
    .values({
      eventoId,
      usuarioId,
      gateway: gateway.id,
      gatewayCobrancaId: cobranca.idExterno,
      metodo: "pix",
      valorBrutoCentavos: valorCentavos,
      valorLiquidoOrganizadorCentavos: valorCentavos,
      expiraEm: cobranca.expiraEm,
    })
    .returning();

  await db.insert(pagamentoInscricoes).values(
    itens.map((i) => ({ pagamentoId: pagamento.id, inscricaoId: i.inscricaoId })),
  );

  return pagamento.id;
}
