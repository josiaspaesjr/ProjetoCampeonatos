import type {
  CobrancaCheckout,
  CobrancaPix,
  GatewayPagamento,
  NotificacaoPagamento,
  NovaCobranca,
} from "./gateway";

/**
 * Adapter Asaas — trilha nacional (Pix, BRL).
 *
 * Env:
 * - ASAAS_API_KEY       chave da conta (sandbox ou produção)
 * - ASAAS_BASE_URL      default https://api-sandbox.asaas.com/v3; produção: https://api.asaas.com/v3
 * - ASAAS_WEBHOOK_TOKEN valor combinado no cabeçalho `asaas-access-token` do webhook
 *
 * Split de pagamento (taxa da plataforma retida) entra quando houver
 * subcontas de organizador — o campo `split` já está previsto abaixo.
 */

const BASE_URL = () =>
  process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3";

async function asaas<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE_URL()}${caminho}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY!,
      ...init?.headers,
    },
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Asaas ${caminho} → ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  return resposta.json() as Promise<T>;
}

/** reutiliza o customer Asaas pelo e-mail ou cria */
async function obterCustomer(nome: string, email: string): Promise<string> {
  const busca = await asaas<{ data: { id: string }[] }>(
    `/customers?email=${encodeURIComponent(email)}&limit=1`,
  );
  if (busca.data.length) return busca.data[0].id;

  const criado = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: nome, email }),
  });
  return criado.id;
}

interface PagamentoAsaas {
  id: string;
  status: string;
}

/** eventos de webhook → status normalizado; null = evento que ignoramos */
export function mapearEventoAsaas(
  evento: string,
): NotificacaoPagamento["status"] | null {
  switch (evento) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      return "pago";
    case "PAYMENT_OVERDUE":
    case "PAYMENT_DELETED":
      return "expirado";
    case "PAYMENT_REFUNDED":
      return "estornado";
    default:
      return null;
  }
}

/** QR consultado na hora da renderização do checkout — nada de QR no banco */
export async function obterPixQrCodeAsaas(idExterno: string) {
  return asaas<{ encodedImage: string; payload: string; expirationDate: string }>(
    `/payments/${idExterno}/pixQrCode`,
  );
}

export const gatewayAsaas: GatewayPagamento = {
  id: "asaas",
  moedasSuportadas: ["BRL"],
  suportaPix: true,

  async criarCobrancaPix(cobranca: NovaCobranca): Promise<CobrancaPix> {
    const customer = await obterCustomer(
      cobranca.nomePagador,
      cobranca.emailPagador,
    );

    const totalCentavos =
      cobranca.itens.reduce((s, i) => s + i.valorCentavos, 0) -
      cobranca.descontoCentavos;

    const hoje = new Date().toISOString().slice(0, 10);
    const pagamento = await asaas<PagamentoAsaas>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer,
        billingType: "PIX",
        value: totalCentavos / 100,
        dueDate: hoje,
        description: cobranca.itens.map((i) => i.descricao).join(" + "),
        externalReference: cobranca.itens[0]?.inscricaoId,
        // TODO(split): walletId da subconta do organizador quando houver onboarding
      }),
    });

    const qr = await asaas<{
      encodedImage: string;
      payload: string;
      expirationDate: string;
    }>(`/payments/${pagamento.id}/pixQrCode`);

    return {
      tipo: "pix",
      idExterno: pagamento.id,
      qrCodeBase64: qr.encodedImage,
      copiaECola: qr.payload,
      expiraEm: new Date(qr.expirationDate),
    };
  },

  async criarCheckoutCartao(): Promise<CobrancaCheckout> {
    throw new Error("Cartão via Asaas ainda não implementado — use Pix");
  },

  async processarWebhook(
    corpo: string,
    cabecalhos: Record<string, string>,
  ): Promise<NotificacaoPagamento> {
    const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
    if (tokenEsperado && cabecalhos["asaas-access-token"] !== tokenEsperado) {
      throw new Error("Webhook Asaas com token inválido");
    }

    const dados = JSON.parse(corpo) as {
      event: string;
      payment?: { id: string; paymentDate?: string };
    };
    const status = mapearEventoAsaas(dados.event);
    if (!status || !dados.payment?.id) {
      throw new Error(`Evento Asaas ignorado: ${dados.event}`);
    }

    return {
      idExterno: dados.payment.id,
      status,
      pagoEm: dados.payment.paymentDate
        ? new Date(`${dados.payment.paymentDate}T12:00:00`)
        : new Date(),
    };
  },
};
