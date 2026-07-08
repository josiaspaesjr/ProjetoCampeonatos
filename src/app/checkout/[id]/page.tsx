import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categorias,
  eventos,
  inscricoes,
  pagamentoInscricoes,
  pagamentos,
} from "@/db/schema";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { obterPixQrCodeAsaas } from "@/lib/pagamentos/asaas";
import { simularPagamentoAprovado } from "./actions";

export default async function PaginaCheckout({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();

  const pagamento = await db.query.pagamentos.findFirst({
    where: eq(pagamentos.id, id),
  });
  if (!pagamento) notFound();

  const [evento, itens] = await Promise.all([
    db.query.eventos.findFirst({ where: eq(eventos.id, pagamento.eventoId) }),
    db.query.pagamentoInscricoes.findMany({
      where: eq(pagamentoInscricoes.pagamentoId, pagamento.id),
    }),
  ]);
  const minhasInscricoes = itens.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, itens.map((i) => i.inscricaoId)),
      })
    : [];
  const cats = minhasInscricoes.length
    ? await db.query.categorias.findMany({
        where: inArray(categorias.id, minhasInscricoes.map((i) => i.categoriaId)),
      })
    : [];
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento?.moeda ?? "BRL",
  });
  const gatewayDev = !process.env.ASAAS_API_KEY && !process.env.STRIPE_SECRET_KEY;

  // com Asaas ativo, o QR é consultado ao vivo (não fica no banco)
  let pixQr: { encodedImage: string; payload: string } | null = null;
  if (
    !gatewayDev &&
    pagamento.gateway === "asaas" &&
    pagamento.status === "criado" &&
    pagamento.gatewayCobrancaId
  ) {
    try {
      pixQr = await obterPixQrCodeAsaas(pagamento.gatewayCobrancaId);
    } catch {
      pixQr = null; // indisponível agora — a página ainda mostra o status
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">Pagamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">{evento?.nome}</p>

        <Card className="mt-6 rounded-2xl">
          <CardContent className="p-6">
            <ul className="divide-y divide-border text-sm">
              {minhasInscricoes.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <span>{nomeCategoria.get(i.categoriaId) ?? "Categoria"}</span>
                  <span
                    className={
                      i.status === "confirmada" ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {i.status === "confirmada" ? "confirmada" : "aguardando pagamento"}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-bold">
                {fmt.format(pagamento.valorBrutoCentavos / 100)}
              </span>
            </div>

            {pagamento.status === "pago" ? (
              <div className="mt-6 rounded-xl bg-success/10 p-5 text-center">
                <p className="text-lg font-semibold text-success">
                  Pagamento confirmado ✓
                </p>
                <p className="mt-1 text-sm text-success">
                  Sua inscrição está garantida. Oss! 👊
                </p>
                <Link
                  href={`/evento/${evento?.slug}`}
                  className="mt-4 inline-block text-sm font-medium text-success underline"
                >
                  Voltar para o evento
                </Link>
              </div>
            ) : (
              <div className="mt-6">
                {pixQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${pixQr.encodedImage}`}
                    alt="QR Code Pix"
                    className="mx-auto h-48 w-48"
                  />
                )}
                <p className="text-sm font-medium">Pix copia e cola</p>
                <code className="mt-2 block break-all rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  {pixQr?.payload ?? `(cobrança de teste ${pagamento.gatewayCobrancaId})`}
                </code>
                {pagamento.expiraEm && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Expira em {pagamento.expiraEm.toLocaleTimeString("pt-BR")} — após
                    isso a vaga é liberada.
                  </p>
                )}

                {gatewayDev && (
                  <form action={simularPagamentoAprovado.bind(null, pagamento.id)}>
                    <Button className="mt-4 w-full">
                      Simular pagamento aprovado (ambiente de teste)
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
