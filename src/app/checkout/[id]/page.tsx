import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categorias,
  eventos,
  inscricoes,
  lotes,
  pagamentoInscricoes,
  pagamentos,
  usuarios,
} from "@/db/schema";
import { AutoRefresh } from "@/components/auto-refresh";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Eyebrow, Logo } from "@/components/marca";
import { PassosInscricao } from "@/components/inscricao/passos";
import { ResumoEvento, type LinhaResumo } from "@/components/inscricao/resumo-evento";
import { dataCurta } from "@/lib/datas";
import { obterPixQrCodeAsaas } from "@/lib/pagamentos/asaas";
import { dentroDoPrazoDePagamento } from "@/lib/pagamentos/prazo";
import { gerarCobrancaInscricao } from "@/app/minhas-inscricoes/actions";
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
  const agora = new Date();
  // cobrança vencida: expirada de fato ou "criada" cujo prazo do Pix já passou
  const expirado =
    !pago &&
    (pagamento.status === "expirado" ||
      (pagamento.status === "criado" &&
        !!pagamento.expiraEm &&
        pagamento.expiraEm < agora));
  // prazo do campeonato (último dia de inscrição) para gerar um novo Pix
  const lotesEvento = evento
    ? await db.query.lotes.findMany({ where: eq(lotes.eventoId, evento.id) })
    : [];
  const podePagarAinda = evento
    ? dentroDoPrazoDePagamento(evento, lotesEvento, agora)
    : false;
  const inscricaoParaCobranca = minhasInscricoes[0]?.id ?? null;

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
      {pagamento.status === "criado" && !expirado && <AutoRefresh segundos={8} />}

      {/* NAV */}
      <nav className="flex items-center justify-between border-b border-white/7 px-6 py-4 md:px-12">
        <Logo />
        {evento && (
          <Link
            href={`/evento/${evento.slug}`}
            className="font-cond text-xs uppercase tracking-[0.1em] text-muted-2 transition-colors hover:text-foreground"
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
              <div className="mb-[26px] flex h-16 w-16 -skew-x-9 items-center justify-center bg-brand">
                <span className="disp skew-x-9 text-[40px] text-white">✓</span>
              </div>
              <Eyebrow className="mb-2 tracking-[0.14em]">
                Inscrição confirmada
              </Eyebrow>
              <h1 className="disp mb-[18px] text-[clamp(48px,6vw,76px)]">
                Você está no chaveamento
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
                    className="bg-brand px-7 py-3 font-cond text-[17px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
                  >
                    Ver cronograma
                  </Link>
                )}
                <Link
                  href="/minhas-inscricoes"
                  className="border border-white/18 px-7 py-3 font-cond text-[17px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
                >
                  Minhas inscrições
                </Link>
              </div>
            </div>
          ) : (
            /* ===== PASSO 2 — PAGAMENTO ===== */
            <div>
              <Eyebrow className="mb-2 tracking-[0.14em]">
                Passo 2 · Pagamento
              </Eyebrow>
              <h1 className="disp mb-1.5 text-[clamp(44px,5vw,64px)]">
                Pague com Pix
              </h1>
              <p className="mb-[34px] max-w-[480px] text-base font-medium text-muted-2">
                A vaga fica reservada enquanto o pagamento estiver pendente.
                Aprovação em segundos.
              </p>

              <div className="max-w-[560px] border border-brand/40 bg-surface">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-6 py-5">
                  <span className="font-cond text-lg font-semibold uppercase">
                    {rotuloCategorias || "Inscrição"}
                  </span>
                  <span className="font-cond text-[13px] uppercase tracking-[0.08em] text-brand-soft">
                    {expirado ? "cobrança expirada" : "aguardando pagamento"}
                  </span>
                </div>
                <div className="p-6">
                  <div className="mb-[22px] flex items-baseline justify-between">
                    <span className="font-cond text-sm uppercase tracking-[0.08em] text-muted-2">
                      Total
                    </span>
                    <span className="disp tnum text-[56px] leading-none text-brand">
                      {fmt.format(pagamento.valorBrutoCentavos / 100)}
                    </span>
                  </div>

                  {!expirado && (
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
                        <div className="mb-2.5 font-cond text-[11px] uppercase tracking-[0.1em] text-muted-2">
                          Pix copia e cola
                        </div>
                        <div className="mb-2.5 break-all border border-white/10 bg-ink px-3.5 py-3 font-cond text-[11px] leading-normal text-muted-2">
                          {pixQr?.payload ??
                            `(cobrança de teste ${pagamento.gatewayCobrancaId})`}
                        </div>
                        <CopiarPix
                          payload={
                            pixQr?.payload ?? pagamento.gatewayCobrancaId ?? ""
                          }
                        />
                      </div>
                    </div>
                  )}

                  {!expirado &&
                    pagamento.expiraEm &&
                    pagamento.status === "criado" && (
                      <div className="mb-5 font-cond text-xs text-muted-2">
                        Expira em{" "}
                        <ContagemRegressiva
                          ate={pagamento.expiraEm.toISOString()}
                        />{" "}
                        — após isso a vaga é liberada.
                      </div>
                    )}
                  {expirado && (
                    <div className="mb-5 border border-white/10 bg-ink px-4 py-4 font-cond">
                      <p className="mb-3 text-xs uppercase tracking-[0.08em] text-brand-soft">
                        Cobrança Pix expirada
                      </p>
                      {podePagarAinda && inscricaoParaCobranca ? (
                        <form
                          action={gerarCobrancaInscricao.bind(
                            null,
                            inscricaoParaCobranca,
                          )}
                        >
                          <BotaoAcaoBruto className="flex h-[52px] w-full cursor-pointer items-center justify-center bg-brand text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
                            Gerar novo Pix
                          </BotaoAcaoBruto>
                        </form>
                      ) : (
                        <p className="text-xs normal-case text-muted-2">
                          O prazo de pagamento deste campeonato já encerrou — a
                          vaga foi liberada.
                        </p>
                      )}
                    </div>
                  )}

                  {gatewayDev && pagamento.status === "criado" && !expirado && (
                    <form action={simularPagamentoAprovado.bind(null, pagamento.id)}>
                      <BotaoAcaoBruto className="flex h-[52px] w-full cursor-pointer items-center justify-center bg-brand font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
                        Simular pagamento aprovado (teste)
                      </BotaoAcaoBruto>
                    </form>
                  )}
                </div>
              </div>

              {evento && (
                <Link
                  href={`/evento/${evento.slug}/inscricao`}
                  className="mt-5 inline-block font-cond text-xs uppercase tracking-[0.08em] text-muted-2 transition-colors hover:text-foreground"
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
