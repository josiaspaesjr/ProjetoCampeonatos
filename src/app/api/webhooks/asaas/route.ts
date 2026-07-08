import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { gatewayAsaas } from "@/lib/pagamentos/asaas";
import { confirmarPagamento } from "@/lib/pagamentos/confirmar";

/**
 * Webhook do Asaas. Configurar no painel Asaas apontando para
 * https://SEU_DOMINIO/api/webhooks/asaas com o token de ASAAS_WEBHOOK_TOKEN.
 *
 * Sempre responde 2xx para eventos processados ou deliberadamente ignorados;
 * o Asaas pausa a fila de webhooks em respostas de erro repetidas.
 */
export async function POST(request: Request) {
  const corpo = await request.text();
  const cabecalhos = Object.fromEntries(
    [...request.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]),
  );

  let notificacao;
  try {
    notificacao = await gatewayAsaas.processarWebhook(corpo, cabecalhos);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro";
    // token inválido = rejeita; evento desconhecido = confirma recebimento
    if (mensagem.includes("token inválido")) {
      return NextResponse.json({ erro: mensagem }, { status: 401 });
    }
    return NextResponse.json({ ignorado: mensagem }, { status: 200 });
  }

  try {
    const db = await getDb();
    await confirmarPagamento(db, notificacao);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    // pagamento não encontrado (ex.: cobrança de outro ambiente): confirma
    // recebimento para não travar a fila, mas registra no log
    console.error("[webhook asaas]", erro);
    return NextResponse.json({ ignorado: true }, { status: 200 });
  }
}
