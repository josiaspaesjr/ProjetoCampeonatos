import type { GatewayPagamento } from "./gateway";
import { escolherGatewayId } from "./gateway";
import { gatewayAsaas } from "./asaas";
import { gatewayDev } from "./dev";

export * from "./gateway";
export { confirmarPagamento } from "./confirmar";

/**
 * Resolve o gateway para a moeda do evento.
 *
 * Sem credenciais configuradas (ASAAS_API_KEY / STRIPE_SECRET_KEY), cai no
 * gateway de desenvolvimento — cobrança simulada, sem dinheiro real.
 */
export function getGateway(moeda: string): GatewayPagamento {
  const id = escolherGatewayId(moeda);

  if (id === "asaas" && process.env.ASAAS_API_KEY) {
    return gatewayAsaas;
  }
  if (id === "stripe" && process.env.STRIPE_SECRET_KEY) {
    throw new Error("Adapter Stripe ainda não implementado"); // TODO(pagamentos)
  }

  return gatewayDev;
}
