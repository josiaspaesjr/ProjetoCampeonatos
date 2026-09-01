import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes, lotes } from "@/db/schema";
import { PublicShell } from "@/components/public-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { codigoCurto, gerarQrDataUrl, urlCheckin } from "@/lib/checkin/qr";
import { dataHora } from "@/lib/datas";
import {
  dentroDoPrazoDePagamento,
  prazoDePagamento,
} from "@/lib/pagamentos/prazo";
import { getAtletaAtual } from "@/lib/sessao";
import { getDicionario } from "@/lib/i18n/server";
import { gerarCobrancaEvento } from "./actions";

export default async function MinhasInscricoes() {
  const atleta = await getAtletaAtual();
  const dm = (await getDicionario()).minhas;

  const rotuloStatus: Record<string, [string, BadgeProps["variant"]]> = {
    pendente_pagamento: [dm.statusAguardando, "warning"],
    confirmada: [dm.statusConfirmada, "success"],
    cancelada: [dm.statusCancelada, "secondary"],
    reembolsada: [dm.statusReembolsada, "secondary"],
  };

  if (!atleta) {
    return (
      <PublicShell>
        <p className="text-muted-foreground">
          {dm.semInscricoesPre}{" "}
          <Link href="/" className="underline">
            {dm.encontreEvento}
          </Link>{" "}
          {dm.semInscricoesPos}
        </p>
      </PublicShell>
    );
  }

  const db = await getDb();
  const minhas = await db.query.inscricoes.findMany({
    where: eq(inscricoes.usuarioId, atleta.id),
    orderBy: desc(inscricoes.criadoEm),
  });

  const eventoIds = [...new Set(minhas.map((i) => i.eventoId))];
  const [cats, evts, lotesEventos] = await Promise.all([
    minhas.length
      ? db.query.categorias.findMany({
          where: inArray(categorias.id, minhas.map((i) => i.categoriaId)),
        })
      : [],
    minhas.length
      ? db.query.eventos.findMany({ where: inArray(eventos.id, eventoIds) })
      : [],
    minhas.length
      ? db.query.lotes.findMany({ where: inArray(lotes.eventoId, eventoIds) })
      : [],
  ]);
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));
  const eventoPorId = new Map(evts.map((e) => [e.id, e]));
  const lotesPorEvento = new Map<string, typeof lotesEventos>();
  for (const l of lotesEventos) {
    const arr = lotesPorEvento.get(l.eventoId) ?? [];
    arr.push(l);
    lotesPorEvento.set(l.eventoId, arr);
  }

  // QR de check-in para inscrições confirmadas — o staff escaneia na pesagem
  const qrPorInscricao = new Map(
    await Promise.all(
      minhas
        .filter((i) => i.status === "confirmada")
        .map(async (i) => {
          const dataUrl = await gerarQrDataUrl(urlCheckin(i.eventoId, i.id));
          return [i.id, dataUrl] as const;
        }),
    ),
  );

  // Agrupado por campeonato: o pagamento é um só por evento, somando as
  // pendentes — peso + absoluto viram um Pix, não dois.
  const porEvento = eventoIds.map((eventoId) => {
    const doEvento = minhas.filter((i) => i.eventoId === eventoId);
    const pendentes = doEvento.filter((i) => i.status === "pendente_pagamento");
    const evento = eventoPorId.get(eventoId);
    const lotesDoEvento = lotesPorEvento.get(eventoId) ?? [];
    return {
      eventoId,
      evento,
      linhas: doEvento,
      pendentes,
      totalCentavos: pendentes.reduce((s, i) => s + (i.precoCentavos ?? 0), 0),
      dentroPrazo: evento
        ? dentroDoPrazoDePagamento(evento, lotesDoEvento)
        : false,
      prazo: evento ? prazoDePagamento(evento, lotesDoEvento) : null,
    };
  });

  return (
    <PublicShell>
      <h1 className="text-2xl font-bold">{dm.titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {atleta.nome} · {atleta.email}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {porEvento.map((g) => {
          const fmt = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: g.evento?.moeda ?? "BRL",
          });
          return (
            <section key={g.eventoId} className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
                <p className="font-medium">{g.evento?.nome}</p>
                {g.pendentes.length > 0 &&
                  (g.dentroPrazo ? (
                    <form action={gerarCobrancaEvento.bind(null, g.eventoId)}>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <span className="text-sm text-muted-foreground">
                          {dm.totalAPagar}{" "}
                          <span className="font-cond text-base font-bold text-foreground">
                            {fmt.format(g.totalCentavos / 100)}
                          </span>
                          {g.pendentes.length > 1 && (
                            <span className="ml-1">
                              · {g.pendentes.length} {dm.nInscricoes}
                            </span>
                          )}
                        </span>
                        <BotaoAcaoBruto className="inline-flex cursor-pointer items-center bg-brand px-3 py-1.5 font-cond text-xs font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
                          {dm.pagarAgora}
                        </BotaoAcaoBruto>
                      </div>
                      {g.prazo && (
                        <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                          {dm.pagueAte} {dataHora(g.prazo)}
                        </span>
                      )}
                    </form>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {dm.prazoEncerrado}
                    </p>
                  ))}
              </div>

              <ul className="divide-y divide-border">
                {g.linhas.map((i) => {
                  const [rotulo, variante] = rotuloStatus[i.status] ?? [
                    i.status,
                    "outline" as const,
                  ];
                  return (
                    <li
                      key={i.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex items-center gap-4">
                        {qrPorInscricao.has(i.id) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrPorInscricao.get(i.id)}
                            alt={dm.qrAlt}
                            className="h-20 w-20 shrink-0 rounded-lg border"
                          />
                        )}
                        <div>
                          <p className="text-sm">
                            {nomeCategoria.get(i.categoriaId)}
                          </p>
                          {qrPorInscricao.has(i.id) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dm.checkinInfo}{" "}
                              <span className="font-cond">
                                {codigoCurto(i.id)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {i.precoCentavos != null && (
                          <span className="font-cond text-sm text-muted-foreground">
                            {fmt.format(i.precoCentavos / 100)}
                          </span>
                        )}
                        <Badge variant={variante}>{rotulo}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {minhas.length === 0 && (
          <p className="rounded-xl border bg-card px-5 py-8 text-center text-muted-foreground">
            {dm.nenhumaAinda}
          </p>
        )}
      </div>
    </PublicShell>
  );
}
