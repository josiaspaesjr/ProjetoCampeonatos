import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lotes } from "@/db/schema";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { NovoLote } from "@/components/organizador/novo-lote";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { conflitosNaLista, diaLocalYmd } from "@/lib/lotes/vigencia";
import { criarLote, excluirLote } from "../../actions";

type StatusLote = "vigente" | "futuro" | "encerrado";

function statusDoLote(inicio: Date, fim: Date, agora: Date): StatusLote {
  if (agora < inicio) return "futuro";
  if (agora > fim) return "encerrado";
  return "vigente";
}

const DIA_MS = 86_400_000;

// cor do segmento/acento por status
const COR_ACENTO: Record<StatusLote, string> = {
  vigente: "#EE2E24",
  futuro: "rgba(238,46,36,0.32)",
  encerrado: "rgba(255,255,255,0.10)",
};
const COR_TEXTO_SEG: Record<StatusLote, string> = {
  vigente: "#ffffff",
  futuro: "#f5f3ef",
  encerrado: "#6B6A64",
};

// pills (bg / borda / texto / rótulo)
const PILL: Record<StatusLote, { bg: string; borda: string; cor: string }> = {
  vigente: {
    bg: "rgba(238,46,36,0.14)",
    borda: "rgba(238,46,36,0.5)",
    cor: "#EE9A94",
  },
  futuro: {
    bg: "transparent",
    borda: "rgba(255,255,255,0.16)",
    cor: "#9C9A93",
  },
  encerrado: {
    bg: "transparent",
    borda: "rgba(255,255,255,0.1)",
    cor: "#6B6A64",
  },
};

export default async function LotesEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const tl = dic.admin.lotes;
  const rotuloStatusLote: Record<StatusLote, string> = {
    vigente: tl.statusVigente,
    futuro: tl.statusFuturo,
    encerrado: tl.statusEncerrado,
  };

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const lts = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, id),
    orderBy: asc(lotes.inicio),
  });

  const agora = new Date();
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
  });
  const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

  // janelas de dias (yyyy-mm-dd) — base da detecção de sobreposição, compartilhada
  // com o formulário (validação de novos lotes) e a sinalização da lista
  const janelas = lts.map((l) => ({
    nome: l.nome,
    inicio: diaLocalYmd(l.inicio),
    fim: diaLocalYmd(l.fim),
  }));
  const conflitos = conflitosNaLista(janelas);
  const totalComConflito = conflitos.filter((c) => c.length > 0).length;

  // ----- derivados (status, resumo, timeline, delta) -----
  const itens = lts.map((l, i) => {
    const status = statusDoLote(l.inicio, l.fim, agora);
    const dias = Math.max(1, Math.round((+l.fim - +l.inicio) / DIA_MS));
    const anterior = lts[i - 1];
    const delta = anterior ? l.precoCentavos - anterior.precoCentavos : 0;
    return { lote: l, status, dias, delta, conflitos: conflitos[i] };
  });

  const vigente = itens.find((x) => x.status === "vigente")?.lote ?? null;
  const precos = lts.map((l) => l.precoCentavos);
  const minPreco = precos.length ? Math.min(...precos) : 0;
  const maxPreco = precos.length ? Math.max(...precos) : 0;
  const precoUnico = minPreco === maxPreco;

  // geometria da linha do tempo
  const t0 = lts.length ? Math.min(...lts.map((l) => +l.inicio)) : 0;
  const t1 = lts.length ? Math.max(...lts.map((l) => +l.fim)) : 0;
  const span = t1 - t0;
  const pct = (ms: number) => (span > 0 ? ((ms - t0) / span) * 100 : 0);
  const hojeNoIntervalo = span > 0 && +agora >= t0 && +agora <= t1;

  return (
    <>
      {erro && (
        <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {totalComConflito > 0 && (
        <p className="border border-warning/40 bg-warning/10 px-4 py-3 font-cond text-sm uppercase tracking-[0.03em] text-warning">
          ⚠ {totalComConflito}{" "}
          {totalComConflito === 1
            ? dic.admin.overview.lote
            : dic.admin.overview.lotes}{" "}
          {tl.conflitoMsg}
        </p>
      )}

      {/* RESUMO — 3 CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <CardResumo
          rotulo={dic.admin.nav.lotes}
          valor={String(lts.length)}
          sub={tl.janelasPreco}
        />
        <CardResumo
          rotulo={tl.faixaPreco}
          valor={lts.length ? fmt.format(minPreco / 100) : "—"}
          sub={
            !lts.length
              ? tl.semLotes
              : precoUnico
                ? tl.precoUnico
                : `${tl.ate} ${fmt.format(maxPreco / 100)}`
          }
        />
        <CardResumo
          rotulo={tl.vigenteAgora}
          valor={vigente ? fmt.format(vigente.precoCentavos / 100) : "—"}
          sub={vigente ? vigente.nome : tl.nenhumAtivo}
          destaque
        />
      </div>

      {/* LINHA DO TEMPO DE PREÇOS */}
      <div className="border border-white/10 bg-surface p-[22px]">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <span className="disp text-[22px]">{tl.linhaTempoPrecos}</span>
          <span className="tnum font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
            {tl.hoje} · {fmtData(agora)}
          </span>
        </div>

        {lts.length === 0 ? (
          <div className="flex h-[92px] items-center justify-center border border-dashed border-white/10 font-cond text-[14px] uppercase text-muted-3">
            {tl.nenhumPosicionar}
          </div>
        ) : (
          <>
            <div className="relative h-[92px] w-full bg-background">
              {itens.map(({ lote, status }) => {
                const left = pct(+lote.inicio);
                const width = Math.max(pct(+lote.fim) - left, 4);
                return (
                  <div
                    key={lote.id}
                    className="absolute inset-y-0"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div
                      className="h-full w-full overflow-hidden border-t-2"
                      style={{
                        transform: "skewX(-6deg)",
                        background: COR_ACENTO[status],
                        borderTopColor:
                          status === "encerrado" ? "rgba(255,255,255,0.18)" : "#EE2E24",
                      }}
                    >
                      <div
                        className="flex h-full flex-col justify-center gap-0.5 px-3"
                        style={{ transform: "skewX(6deg)", color: COR_TEXTO_SEG[status] }}
                      >
                        <span className="truncate font-cond text-[13px] font-semibold uppercase tracking-[0.03em]">
                          {lote.nome}
                        </span>
                        <span className="disp tnum text-[17px]">
                          {fmt.format(lote.precoCentavos / 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* MARCADOR HOJE */}
              {hojeNoIntervalo && (
                <div
                  className="absolute inset-y-0 z-10 w-px bg-white"
                  style={{ left: `${pct(+agora)}%` }}
                >
                  <span
                    className="absolute -left-[3px] -top-1 h-2 w-2 bg-white"
                    style={{ transform: "skewX(-6deg)" }}
                  />
                </div>
              )}
            </div>

            {/* EIXO */}
            <div className="tnum mt-2 flex justify-between font-cond text-[12px] uppercase tracking-[0.06em] text-muted-3">
              <span>{fmtData(new Date(t0))}</span>
              <span>{fmtData(new Date(t1))}</span>
            </div>
          </>
        )}
      </div>

      {/* CRIADOR (esq.) + LISTA (dir.) — form à esquerda via row-reverse */}
      <div className="flex flex-col gap-5 lg:flex-row-reverse lg:items-start">
        {/* LISTA (DOM primeiro → direita no desktop) */}
        <div className="flex-1 lg:min-w-0">
          {lts.length === 0 ? (
            <div className="border border-white/10 bg-surface px-[22px] py-12 text-center font-cond text-[15px] uppercase text-muted-3">
              {tl.nenhumCadastrado}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itens.map(({ lote, status, dias, delta, conflitos: conflitosDoLote }, i) => {
                const pill = PILL[status];
                const temConflito = conflitosDoLote.length > 0;
                return (
                  <div
                    key={lote.id}
                    className={`relative flex flex-wrap items-center gap-x-5 gap-y-3 border bg-surface py-[17px] pl-6 pr-[22px] ${
                      temConflito ? "border-warning/45" : "border-white/10"
                    }`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: COR_ACENTO[status] }}
                    />

                    {/* ordem */}
                    <span
                      className={`disp tnum text-[34px] leading-none ${
                        status === "vigente" ? "text-brand" : "text-muted-3"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* nome + status + delta + período */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="whitespace-nowrap font-cond text-xl font-semibold uppercase">
                          {lote.nome}
                        </span>
                        <span
                          className="inline-flex h-5 items-center border px-2 font-cond text-[11px] font-semibold uppercase tracking-[0.06em]"
                          style={{
                            background: pill.bg,
                            borderColor: pill.borda,
                            color: pill.cor,
                          }}
                        >
                          {rotuloStatusLote[status]}
                        </span>
                        {temConflito && (
                          <span className="inline-flex h-5 items-center border border-warning/50 bg-warning/10 px-2 font-cond text-[11px] font-semibold uppercase tracking-[0.06em] text-warning">
                            ⚠ {tl.sobreposto}
                          </span>
                        )}
                        {i > 0 && delta !== 0 && (
                          <span
                            className={`tnum inline-flex h-5 items-center border border-dashed px-2 font-cond text-[11px] font-semibold uppercase tracking-[0.04em] ${
                              delta > 0
                                ? "border-brand/40 text-brand-soft"
                                : "border-success/40 text-success"
                            }`}
                          >
                            {delta > 0 ? "▲" : "▼"} {fmt.format(Math.abs(delta) / 100)}
                          </span>
                        )}
                      </div>
                      <div className="tnum mt-0.5 font-cond text-sm uppercase tracking-[0.04em] text-muted-2">
                        {fmtData(lote.inicio)} → {fmtData(lote.fim)}
                        <span className="text-muted-3">
                          {" "}
                          · {dias} {dias === 1 ? tl.dia : tl.dias}
                        </span>
                      </div>
                      {temConflito && (
                        <div className="mt-1 font-cond text-[12px] uppercase tracking-[0.03em] text-warning">
                          {tl.datasSobrepoe} {conflitosDoLote.join(", ")}
                        </div>
                      )}
                      {lote.variacoes && lote.variacoes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {lote.variacoes.map((v, vi) => (
                            <span
                              key={vi}
                              className="tnum inline-flex items-center gap-1 border border-white/10 bg-background px-2 py-0.5 font-cond text-[11px] uppercase tracking-[0.03em] text-text-2"
                            >
                              {v.nome}
                              <span className="text-brand-soft">
                                {fmt.format(v.precoCentavos / 100)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* preço + 2ª inscrição */}
                    <div className="text-right">
                      <div
                        className={`disp tnum text-[28px] leading-none ${
                          status === "encerrado" ? "text-muted-3" : ""
                        }`}
                      >
                        {fmt.format(lote.precoCentavos / 100)}
                      </div>
                      <div className="mt-1 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                        {lote.precoSegundaInscricaoCentavos != null
                          ? `${tl.segundaInsc} ${fmt.format(lote.precoSegundaInscricaoCentavos / 100)}`
                          : tl.porInscricao}
                      </div>
                    </div>

                    {/* excluir */}
                    <ConfirmarExclusao
                      acao={excluirLote.bind(null, evento.id, lote.id)}
                      titulo={tl.excluirLote.titulo}
                      descricao={
                        <>
                          {tl.excluirLote.descPre}{" "}
                          <b className="text-foreground">{lote.nome}</b> (
                          {fmtData(lote.inicio)} → {fmtData(lote.fim)}){" "}
                          {tl.excluirLote.descPos}
                        </>
                      }
                      confirmarRotulo={tl.excluirLote.confirmar}
                      rotulo={dic.admin.comum.excluir}
                      title={tl.excluirLote.confirmar}
                      className="cursor-pointer font-cond text-sm font-medium uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CRIADOR (DOM depois → esquerda no desktop) */}
        <div className="w-full lg:sticky lg:top-4 lg:w-[380px] lg:shrink-0">
          <NovoLote
            criar={criarLote.bind(null, evento.id)}
            moeda={evento.moeda}
            lotesExistentes={janelas}
          />
        </div>
      </div>
    </>
  );
}

function CardResumo({
  rotulo,
  valor,
  sub,
  destaque,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  destaque?: boolean;
}) {
  return (
    <div className="relative border border-white/10 bg-surface py-4 pl-6 pr-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
      <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
        {rotulo}
      </div>
      <div
        className={`disp tnum mt-1.5 text-[38px] leading-none ${
          destaque ? "text-brand" : ""
        }`}
      >
        {valor}
      </div>
      <div className="mt-1.5 truncate font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
        {sub}
      </div>
    </div>
  );
}
