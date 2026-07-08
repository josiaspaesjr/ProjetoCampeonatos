/**
 * Abstração de gateway de pagamento — dupla trilha:
 *
 * - Nacional (BRL): Pix + split de pagamento (Asaas ou Mercado Pago).
 * - Internacional (EUR/USD/...): cartão multi-moeda (Stripe; PayPal futuro).
 *
 * O domínio conversa apenas com esta interface; cada adapter vive em seu
 * próprio arquivo (asaas.ts, stripe.ts) e é escolhido pela moeda do evento.
 */

export type GatewayId = "asaas" | "mercadopago" | "stripe";

export interface ItemCobranca {
  inscricaoId: string;
  descricao: string;
  valorCentavos: number;
}

export interface NovaCobranca {
  eventoId: string;
  usuarioId: string;
  emailPagador: string;
  nomePagador: string;
  moeda: string;
  itens: ItemCobranca[];
  descontoCentavos: number;
  /** taxa da plataforma retida no split, em centavos */
  taxaPlataformaCentavos: number;
}

export interface CobrancaPix {
  tipo: "pix";
  idExterno: string;
  qrCodeBase64: string;
  copiaECola: string;
  expiraEm: Date;
}

export interface CobrancaCheckout {
  tipo: "checkout";
  idExterno: string;
  /** URL de checkout hospedado do gateway (cartão) */
  url: string;
}

export type Cobranca = CobrancaPix | CobrancaCheckout;

/** evento normalizado vindo de webhook de qualquer gateway */
export interface NotificacaoPagamento {
  idExterno: string;
  status: "pago" | "expirado" | "estornado";
  pagoEm?: Date;
  taxaGatewayCentavos?: number;
}

export interface GatewayPagamento {
  id: GatewayId;
  moedasSuportadas: readonly string[];
  suportaPix: boolean;
  criarCobrancaPix?(cobranca: NovaCobranca): Promise<CobrancaPix>;
  criarCheckoutCartao(cobranca: NovaCobranca): Promise<CobrancaCheckout>;
  /** valida assinatura e normaliza o payload do webhook */
  processarWebhook(
    corpo: string,
    cabecalhos: Record<string, string>,
  ): Promise<NotificacaoPagamento>;
}

/** BRL → trilha nacional; demais moedas → trilha internacional */
export function escolherGatewayId(moeda: string): GatewayId {
  return moeda.toUpperCase() === "BRL" ? "asaas" : "stripe";
}
