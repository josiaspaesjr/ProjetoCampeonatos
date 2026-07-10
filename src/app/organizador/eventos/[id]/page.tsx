import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lotes, pagamentos } from "@/db/schema";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { ExcluirEvento } from "@/components/organizador/excluir-evento";
import { getUsuarioAtual } from "@/lib/auth";
import { dataCurta, diaMes } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { encerrarInscricoes, excluirEvento, publicarEvento } from "../actions";

const MODALIDADE_ROTULO: Record<string, string> = {
  gi_nogi: "Gi + No-Gi",
  gi: "Gi",
  nogi: "No-Gi",
};

const STATUS_INSCRICAO: Record<string, { rotulo: string; cor: string }> = {
  confirmada: { rotulo: "Confirmada", cor: "text-success" },
  pendente_pagamento: { rotulo: "Pendente Pix", cor: "text-brand-soft" },
  cancelada: { rotulo: "Cancelada", cor: "text-muted-3" },
  reembolsada: { rotulo: "Reembolsada", cor: "text-muted-3" },
};

export default async function VisaoGeralEvento({
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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const [cats, lts, inscritos, pgs] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, id) }),
    db.query.inscricoes.findMany({
      where: eq(inscricoes.eventoId, id),
      orderBy: desc(inscricoes.criadoEm),
    }),
    db.query.pagamentos.findMany({
      where: and(eq(pagamentos.eventoId, id), eq(pagamentos.status, "pago")),
    }),
  ]);
  const chavesGeradas = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];

  const agora = new Date();
  const confirmadas = inscritos.filter((i) => i.status === "confirmada");
  const equipes = new Set(
    confirmadas.map((i) => i.academiaNome).filter(Boolean),
  ).size;
  const vigente = lts.find((l) => l.inicio <= agora && agora <= l.fim);
  const receitaCentavos = pgs.reduce(
    (soma, p) => soma + p.valorLiquidoOrganizadorCentavos,
    0,
  );

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });

  const base = `/organizador/eventos/${id}`;
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  const checklist = [
    {
      rotulo: "Evento publicado",
      feito: evento.status !== "rascunho",
      dica: evento.status === "rascunho" ? "pendente" : "ao vivo",
      href: base,
    },
    {
      rotulo: "Lotes de preço",
      feito: lts.length > 0,
      dica: `${lts.length} lote${lts.length === 1 ? "" : "s"}`,
      href: `${base}/lotes`,
    },
    {
      rotulo: "Grade de categorias",
      feito: cats.length > 0,
      dica: String(cats.length),
      href: `${base}/categorias`,
    },
    {
      rotulo: "Áreas definidas",
      feito: !!evento.numAreas,
      dica: evento.numAreas ? `${evento.numAreas} áreas` : "pendente",
      href: `${base}/areas`,
    },
    {
      rotulo: "Chaves geradas",
      feito: chavesGeradas.length > 0,
      dica: chavesGeradas.length ? String(chavesGeradas.length) : "pendente",
      href: `${base}/chaves`,
    },
  ];
  const pct = Math.round(
    (checklist.filter((c) => c.feito).length / checklist.length) * 100,
  );

  const stats = [
    {
      rotulo: "Inscrições",
      valor: String(confirmadas.length),
      sub: `em ${equipes} equipe${equipes === 1 ? "" : "s"}`,
      destaque: false,
    },
    {
      rotulo: "Categorias",
      valor: String(cats.length),
      sub: "grade CBJJ",
      destaque: false,
    },
    {
      rotulo: "Lotes",
      valor: String(lts.length),
      sub: vigente ? `${vigente.nome} vigente` : "nenhum vigente",
      destaque: true,
    },
    {
      rotulo: "Receita",
      valor: fmt.format(receitaCentavos / 100),
      sub: "líquido confirmado",
      destaque: false,
    },
  ];

  const recentes = inscritos.slice(0, 5);
  const chips = [
    dataCurta(evento.dataInicio),
    evento.cidade ? `${evento.cidade}/${evento.uf ?? ""}` : null,
    MODALIDADE_ROTULO[evento.modalidade] ?? "Gi + No-Gi",
    evento.numAreas ? `${evento.numAreas} áreas` : null,
    evento.dataPesagem ? `Pesagem ${diaMes(evento.dataPesagem)}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {erro && (
        <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* CARD BANNER DO EVENTO */}
      <div className="grid overflow-hidden border border-white/10 bg-surface lg:grid-cols-[300px_1fr]">
        <div className="relative min-h-[200px] bg-hover-row">
          {evento.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={evento.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-stripes-foto" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_55%,rgba(17,17,18,0.9))]" />
        </div>
        <div className="flex flex-col justify-center px-[30px] py-[26px]">
          {evento.circuito && (
            <div className="mb-1.5 font-cond text-[13px] uppercase tracking-[0.1em] text-brand">
              {evento.circuito}
            </div>
          )}
          <div className="disp mb-3.5 text-[52px] leading-[0.86]">
            {evento.nome}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-[7px] border border-white/10 bg-ink px-3 py-1.5 font-cond text-[13px] uppercase tracking-[0.04em] text-text-2"
              >
                <span className="text-brand">◆</span>
                {c}
              </span>
            ))}
          </div>
          <div className="mt-[18px] flex flex-wrap items-center gap-4">
            <span className="text-[13px] font-medium text-muted-2">
              Página pública:{" "}
              <Link
                href={`/evento/${evento.slug}`}
                target="_blank"
                className="font-semibold text-brand-soft hover:text-brand"
              >
                /evento/{evento.slug} ↗
              </Link>
            </span>
            {evento.status === "rascunho" && (
              <>
                <form action={publicarEvento.bind(null, evento.id)}>
                  <BotaoAcao variant="success" size="sm">
                    Publicar evento
                  </BotaoAcao>
                </form>
                <ExcluirEvento
                  excluir={excluirEvento.bind(null, evento.id)}
                  nome={evento.nome}
                />
              </>
            )}
            {evento.status === "publicado" && (
              <form action={encerrarInscricoes.bind(null, evento.id)}>
                <BotaoAcao variant="outline" size="sm">
                  Encerrar inscrições
                </BotaoAcao>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* STATS + PREPARAÇÃO */}
      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((s) => (
            <div
              key={s.rotulo}
              className="relative overflow-hidden border border-white/10 bg-surface px-[22px] py-5"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-brand" />
              <div className="mb-1 font-cond text-[13px] uppercase tracking-[0.08em] text-muted-2">
                {s.rotulo}
              </div>
              <div
                className={cn(
                  "disp tnum text-[56px]",
                  s.destaque ? "text-brand" : "text-foreground",
                )}
              >
                {s.valor}
              </div>
              <div className="font-cond text-xs uppercase tracking-[0.04em] text-muted-3">
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="border border-white/10 bg-surface px-6 py-[22px]">
          <div className="mb-1 flex items-baseline justify-between">
            <div className="disp text-[28px]">Preparação</div>
            <span className="tnum font-cond text-sm text-brand-soft">{pct}%</span>
          </div>
          <div className="my-2 mb-[18px] h-1.5 overflow-hidden border border-white/8 bg-ink">
            <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-col">
            {checklist.map((c) => (
              <Link
                key={c.rotulo}
                href={c.href}
                className="flex items-center gap-3 border-t border-white/6 py-[11px] transition-colors hover:bg-white/[0.02]"
              >
                <span
                  className={cn(
                    "disp flex h-[22px] w-[22px] shrink-0 items-center justify-center border text-[13px] text-white",
                    c.feito ? "border-brand bg-brand" : "border-white/25",
                  )}
                >
                  {c.feito ? "✓" : ""}
                </span>
                <span
                  className={cn(
                    "flex-1 font-cond text-[17px] font-semibold uppercase tracking-[0.02em]",
                    c.feito ? "text-foreground" : "text-muted-2",
                  )}
                >
                  {c.rotulo}
                </span>
                <span className="font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
                  {c.dica}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* INSCRIÇÕES RECENTES */}
      <div>
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="disp text-[34px]">Inscrições recentes</h2>
          <Link
            href={`${base}/inscricoes`}
            className="font-cond text-sm uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-foreground"
          >
            {confirmadas.length} confirmada{confirmadas.length === 1 ? "" : "s"} →
          </Link>
        </div>
        <div className="border border-white/10 bg-surface">
          {recentes.length === 0 ? (
            <div className="px-6 py-10 text-center font-cond text-[15px] uppercase text-muted-3">
              Nenhuma inscrição ainda — divulgue a página pública do evento.
            </div>
          ) : (
            recentes.map((i) => {
              const st = STATUS_INSCRICAO[i.status] ?? {
                rotulo: i.status,
                cor: "text-muted-2",
              };
              return (
                <div
                  key={i.id}
                  className="grid items-center gap-4 border-b border-white/6 px-[22px] py-[13px] last:border-b-0 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <span className="font-cond text-lg font-semibold uppercase">
                    {i.nomeAtleta}
                  </span>
                  <span className="text-sm font-medium text-muted-2">
                    {i.academiaNome ?? "Sem equipe"}
                  </span>
                  <span className="font-cond text-[13px] uppercase tracking-[0.03em] text-text-2">
                    {nomeCategoria.get(i.categoriaId) ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "font-cond text-xs font-semibold uppercase tracking-[0.06em]",
                      st.cor,
                    )}
                  >
                    {st.rotulo}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
