import { afterEach, describe, expect, it, vi } from "vitest";
import { gatewayAsaas, mapearEventoAsaas } from "./asaas";

describe("mapeamento de eventos do webhook Asaas", () => {
  it.each([
    ["PAYMENT_RECEIVED", "pago"],
    ["PAYMENT_CONFIRMED", "pago"],
    ["PAYMENT_OVERDUE", "expirado"],
    ["PAYMENT_DELETED", "expirado"],
    ["PAYMENT_REFUNDED", "estornado"],
  ])("%s → %s", (evento, esperado) => {
    expect(mapearEventoAsaas(evento)).toBe(esperado);
  });

  it("evento desconhecido → null (ignorado)", () => {
    expect(mapearEventoAsaas("PAYMENT_CREATED")).toBeNull();
    expect(mapearEventoAsaas("QUALQUER_COISA")).toBeNull();
  });
});

describe("processarWebhook", () => {
  afterEach(() => vi.unstubAllEnvs());

  const corpoPago = JSON.stringify({
    event: "PAYMENT_RECEIVED",
    payment: { id: "pay_123", paymentDate: "2026-07-08" },
  });

  it("normaliza pagamento recebido", async () => {
    const n = await gatewayAsaas.processarWebhook(corpoPago, {});
    expect(n).toMatchObject({ idExterno: "pay_123", status: "pago" });
    expect(n.pagoEm?.getFullYear()).toBe(2026);
  });

  it("valida o token quando ASAAS_WEBHOOK_TOKEN está definido", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");

    await expect(
      gatewayAsaas.processarWebhook(corpoPago, { "asaas-access-token": "errado" }),
    ).rejects.toThrow(/token inválido/);

    await expect(
      gatewayAsaas.processarWebhook(corpoPago, { "asaas-access-token": "segredo" }),
    ).resolves.toMatchObject({ status: "pago" });
  });

  it("rejeita eventos ignorados e payload sem payment", async () => {
    await expect(
      gatewayAsaas.processarWebhook(
        JSON.stringify({ event: "PAYMENT_CREATED", payment: { id: "x" } }),
        {},
      ),
    ).rejects.toThrow(/ignorado/);

    await expect(
      gatewayAsaas.processarWebhook(JSON.stringify({ event: "PAYMENT_RECEIVED" }), {}),
    ).rejects.toThrow(/ignorado/);
  });
});
