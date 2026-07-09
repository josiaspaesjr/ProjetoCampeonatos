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
  usuarios,
} from "@/db/schema";
import { AutoRefresh } from "@/components/auto-refresh";
import { Eyebrow, Logo } from "@/components/marca";
import { PassosInscricao } from "@/components/inscricao/passos";
import { ResumoEvento, type LinhaResumo } from "@/components/inscricao/resumo-evento";
import { dataCurta } from "@/lib/datas";
import { obterPixQrCodeAsaas } from "@/lib/pagamentos/asaas";
import { simularPagamentoAprovado } from "./actions";
import { ContagemRegressiva } from "./contagem-regressiva";
import { CopiarPix } from "./copiar-pix";

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** QR decorativo do ambiente de teste (o gateway dev não emite QR real). */
function QrPlaceholder() {
  const celulas: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    const r = Math.floor(i / 7);
    const c = i % 7;
    const canto = (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
    const ligado = canto
      ? r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1) ||
        (r >= 4 && (r === 4 || r === 6 || c === 0 || c === 2 || (r === 5 && c === 1)))
      : (i * 7 + 3) % 5 < 2;
    celulas.push(ligado);
  }
  return (
    <div className="grid h-28 w-28 shrink-0 grid-cols-7 grid-rows-7 gap-0.5 bg-foreground p-2">
      {celulas.map((ligado, i) => (
        <div key={i} className={ligado ? "bg-ink" : "bg-foreground"} />
      ))}
    </div>
  );
}

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

  const [evento, itens, usuario] = await Promise.all([
    db.query.eventos.findFirst({ where: eq(eventos.id, pagamento.eventoId) }),
    db.query.pagamentoInscricoes.findMany({
      where: eq(pagamentoInscricoes.pagamentoId, pagamento.id),
    }),
    db.query.usuarios.findFirst({ where: eq(usuarios.id, pagamento.usuarioId) }),
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
  const rotuloCategorias = minhasInscricoes
    .map((i) => nomeCategoria.get(i.categoriaId) ?? "Categoria")
    .join(" + ");
  const atleta = minhasInscricoes[0];

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento?.moeda ?? "BRL",
    maximumFractionDigits: 0,
  });
  const gatewayDev = !process.env.ASAAS_API_KEY && !process.env.STRIPE_SECRET_KEY;
  const pago = pagamento.status === "pago";

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

  const local =
    evento?.endereco ?? (evento?.cidade ? `${evento.cidade}/${evento.uf ?? ""}` : "");
  const linhasResumo: LinhaResumo[] = [
    { k: "Atleta", v: atleta?.nomeAtleta ?? null },
    { k: "Faixa", v: atleta ? capitalizar(atleta.faixa) : null, dourado: true },
    ...minhasInscricoes.map((i, idx) => ({
      k: minhasInscricoes.length > 1 ? `Categoria ${idx + 1}` : "Categoria",
      v: nomeCategoria.get(i.categoriaId) ?? null,
      dourado: true,
    })),
    {
      k: "Status",
      v: pago ? "Confirmada" : "Aguardando Pix",
      dourado: pago,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* re-busca o status enquanto o pagamento está pendente (webhook Pix) */}
      {pagamento.status === "criado" && <AutoRefresh segundos={8} />}

      {/* NAV */}
      <nav className="flex items-center justify-between border-b border-white/7 px-6 py-4 md:px-12">
        <Logo />
        {evento && (
          <Link
            href={`/evento/${evento.slug}`}
            className="font-mono text-xs uppercase tracking-[0.1em] text-muted-2 transition-colors hover:text-foreground"
          >
            ← Voltar ao evento
          </Link>
        )}
      </nav>

      <div className="grid flex-1 items-stretch lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="px-6 py-12 md:px-16">
          <PassosInscricao atual={pago ? 3 : 2} />

          {pago ? (
            /* ===== PASSO 3 — CONFIRMAÇÃO ===== */
            <div className="max-w-[560px] pt-5">
              <div className="mb-7 flex h-16 w-16 rotate-45 items-center justify-center border-2 border-gold">
                <span className="-rotate-45 text-3xl text-gold">✓</span>
              </div>
              <Eyebrow className="mb-3">{"// Inscrição confirmada"}</Eyebrow>
              <h1 className="mb-5 font-display text-[clamp(36px,5vw,60px)] font-extrabold uppercase leading-[0.95]">
                Você está no
                <br />
                chaveamento
              </h1>
              <p className="mb-4 text-[17px] leading-relaxed text-muted-2">
                Pagamento aprovado. Sua vaga em{" "}
                <strong className="text-foreground">{rotuloCategorias}</strong>{" "}
                está confirmada
                {usuario ? (
                  <>
                    {" "}
                    para <strong className="text-foreground">{usuario.email}</strong>
                  </>
                ) : null}
                . Oss! 👊
              </p>
              <p className="mb-9 text-[15px] text-muted-2">
                Acompanhe o cronograma ao vivo no dia do evento — a chamada de
                área aparece em tempo real.
              </p>
              <div className="flex flex-wrap gap-4">
                {evento && (
                  <Link
                    href={`/evento/${evento.slug}/cronograma`}
                    className="bg-gold px-[30px] py-[15px] font-display text-[15px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-gold-light"
                  >
                    Ver cronograma
                  </Link>
                )}
                <Link
                  href="/minhas-inscricoes"
                  className="border border-white/20 px-[30px] py-[15px] font-display text-[15px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:border-white/40"
                >
                  Minhas inscrições
                </Link>
              </div>
            </div>
          ) : (
            /* ===== PASSO 2 — PAGAMENTO ===== */
            <div>
              <Eyebrow className="mb-3">{"// Passo 2 · Pagamento"}</Eyebrow>
              <h1 className="mb-2 font-display text-[clamp(34px,4.6vw,54px)] font-extrabold uppercase leading-[0.95]">
                Pague com Pix
                <br />e garanta a vaga
              </h1>
              <p className="mb-9 max-w-[480px] text-base text-muted-2">
                A vaga fica reservada enquanto o pagamento estiver pendente.
                Aprovação em segundos.
              </p>

              <div className="max-w-[560px] border border-gold/40 bg-panel-gold">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-[26px] py-[22px]">
                  <span className="font-display text-lg font-semibold uppercase">
                    {rotuloCategorias || "Inscrição"}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-gold-light">
                    aguardando pagamento
                  </span>
                </div>
                <div className="p-[26px]">
                  <div className="mb-6 flex items-baseline justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-2">
                      Total
                    </span>
                    <span className="font-display text-[46px] font-extrabold leading-none text-gold">
                      {fmt.format(pagamento.valorBrutoCentavos / 100)}
                    </span>
                  </div>

                  <div className="mb-5 flex flex-wrap items-center gap-5">
                    {pixQr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/png;base64,${pixQr.encodedImage}`}
                        alt="QR Code Pix"
                        className="h-28 w-28 shrink-0 bg-white p-1"
                      />
                    ) : (
                      <QrPlaceholder />
                    )}
                    <div className="min-w-[200px] flex-1">
                      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
                        Pix copia e cola
                      </div>
                      <div className="mb-2.5 break-all border border-white/10 bg-ink px-3.5 py-3 font-mono text-[11px] leading-normal text-muted-2">
                        {pixQr?.payload ??
                          `(cobrança de teste ${pagamento.gatewayCobrancaId})`}
                      </div>
                      <CopiarPix
                        payload={pixQr?.payload ?? pagamento.gatewayCobrancaId ?? ""}
                      />
                    </div>
                  </div>

                  {pagamento.expiraEm && pagamento.status === "criado" && (
                    <div className="mb-5 font-mono text-xs text-muted-2">
                      Expira em{" "}
                      <ContagemRegressiva ate={pagamento.expiraEm.toISOString()} />{" "}
                      — após isso a vaga é liberada.
                    </div>
                  )}
                  {pagamento.status === "expirado" && (
                    <div className="mb-5 border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive">
                      Cobrança expirada — refaça a inscrição para gerar um novo
                      Pix.
                    </div>
                  )}

                  {gatewayDev && pagamento.status === "criado" && (
                    <form action={simularPagamentoAprovado.bind(null, pagamento.id)}>
                      <button className="w-full cursor-pointer bg-gold p-4 font-display text-base font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-gold-light">
                        Simular pagamento aprovado (teste)
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {evento && (
                <Link
                  href={`/evento/${evento.slug}/inscricao`}
                  className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.08em] text-muted-2 transition-colors hover:text-foreground"
                >
                  ← Editar dados
                </Link>
              )}
            </div>
          )}
        </div>

        {/* RESUMO */}
        <ResumoEvento
          nomeEvento={evento?.nome ?? "Evento"}
          meta={
            evento
              ? [dataCurta(evento.dataInicio), local].filter(Boolean).join(" · ")
              : ""
          }
          bannerUrl={evento?.bannerUrl}
          linhas={linhasResumo}
          precoRotulo="Total"
          precoValor={fmt.format(pagamento.valorBrutoCentavos / 100)}
          notaRodape={pago ? "Pagamento aprovado via Pix" : "Pagamento via Pix"}
        />
      </div>
    </div>
  );
}
