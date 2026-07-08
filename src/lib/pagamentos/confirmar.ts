import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { inscricoes, pagamentoInscricoes, pagamentos } from "@/db/schema";
import type { NotificacaoPagamento } from "./gateway";

/**
 * Caminho único de confirmação de pagamento — usado tanto pelo botão de
 * simulação (dev) quanto pelos webhooks reais (Asaas/Stripe) no futuro.
 * Idempotente: notificação repetida não altera um pagamento já processado.
 */
export async function confirmarPagamento(
  db: Db,
  notificacao: NotificacaoPagamento,
) {
  const pagamento = await db.query.pagamentos.findFirst({
    where: eq(pagamentos.gatewayCobrancaId, notificacao.idExterno),
  });
  if (!pagamento) throw new Error(`Pagamento não encontrado: ${notificacao.idExterno}`);
  if (pagamento.status !== "criado") return pagamento;

  const itens = await db.query.pagamentoInscricoes.findMany({
    where: eq(pagamentoInscricoes.pagamentoId, pagamento.id),
  });
  const inscricaoIds = itens.map((i) => i.inscricaoId);

  if (notificacao.status === "pago") {
    await db
      .update(pagamentos)
      .set({
        status: "pago",
        pagoEm: notificacao.pagoEm ?? new Date(),
        taxaGatewayCentavos: notificacao.taxaGatewayCentavos ?? 0,
      })
      .where(eq(pagamentos.id, pagamento.id));
    await db
      .update(inscricoes)
      .set({ status: "confirmada", atualizadoEm: new Date() })
      .where(inArray(inscricoes.id, inscricaoIds));
  } else if (notificacao.status === "expirado") {
    await db
      .update(pagamentos)
      .set({ status: "expirado" })
      .where(eq(pagamentos.id, pagamento.id));
  } else if (notificacao.status === "estornado") {
    await db
      .update(pagamentos)
      .set({ status: "estornado" })
      .where(eq(pagamentos.id, pagamento.id));
    await db
      .update(inscricoes)
      .set({ status: "reembolsada", atualizadoEm: new Date() })
      .where(inArray(inscricoes.id, inscricaoIds));
  }

  return pagamento;
}
