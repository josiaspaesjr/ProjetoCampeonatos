import type {
  CobrancaCheckout,
  CobrancaPix,
  GatewayPagamento,
  NotificacaoPagamento,
  NovaCobranca,
} from "./gateway";

/**
 * Gateway de desenvolvimento — simula um PSP Pix sem tocar em dinheiro real.
 *
 * A cobrança é "aprovada" pelo botão de simulação na página de checkout, que
 * percorre o mesmo caminho de confirmação que o webhook de um gateway real.
 */
export const gatewayDev: GatewayPagamento = {
  id: "asaas",
  moedasSuportadas: ["BRL"],
  suportaPix: true,

  async criarCobrancaPix(cobranca: NovaCobranca): Promise<CobrancaPix> {
    const idExterno = `dev_${crypto.randomUUID()}`;
    const total =
      cobranca.itens.reduce((s, i) => s + i.valorCentavos, 0) -
      cobranca.descontoCentavos;
    return {
      tipo: "pix",
      idExterno,
      qrCodeBase64: "",
      copiaECola: `00020126DEV-PIX-SIMULADO|${idExterno}|${total}|${cobranca.emailPagador}`,
      expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    };
  },

  async criarCheckoutCartao(): Promise<CobrancaCheckout> {
    throw new Error("Cartão ainda não implementado no gateway dev");
  },

  async processarWebhook(corpo: string): Promise<NotificacaoPagamento> {
    const dados = JSON.parse(corpo) as { idExterno: string };
    return { idExterno: dados.idExterno, status: "pago", pagoEm: new Date() };
  },
};
