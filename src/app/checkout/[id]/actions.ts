"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { pagamentos } from "@/db/schema";
import { confirmarPagamento } from "@/lib/pagamentos";

/**
 * Simulação de aprovação — disponível apenas com o gateway dev (sem chaves
 * reais configuradas). Percorre o mesmo caminho do webhook de produção.
 */
export async function simularPagamentoAprovado(pagamentoId: string) {
  if (process.env.ASAAS_API_KEY || process.env.STRIPE_SECRET_KEY) {
    throw new Error("Simulação indisponível com gateway real configurado");
  }

  const db = await getDb();
  const pagamento = await db.query.pagamentos.findFirst({
    where: eq(pagamentos.id, pagamentoId),
  });
  if (!pagamento?.gatewayCobrancaId) throw new Error("Pagamento não encontrado");

  await confirmarPagamento(db, {
    idExterno: pagamento.gatewayCobrancaId,
    status: "pago",
    pagoEm: new Date(),
  });

  revalidatePath(`/checkout/${pagamentoId}`);
}
