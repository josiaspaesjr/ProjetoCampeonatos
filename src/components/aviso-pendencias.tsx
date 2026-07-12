import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes, lotes } from "@/db/schema";
import { dataHora } from "@/lib/datas";
import {
  dentroDoPrazoDePagamento,
  prazoDePagamento,
} from "@/lib/pagamentos/prazo";
import { getAtletaAtual } from "@/lib/sessao";

/**
 * Faixa global de pendências de pagamento.
 *
 * Sempre que o atleta logado tem inscrições aguardando pagamento (ainda dentro
 * do prazo do campeonato), aparece no topo das páginas para instigá-lo a pagar
 * logo. Renderiza `null` quando não há sessão ou nenhuma pendência pagável.
 */
export async function AvisoPendencias() {
  const atleta = await getAtletaAtual();
  if (!atleta) return null;

  const db = await getDb();
  const pendentes = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.usuarioId, atleta.id),
      eq(inscricoes.status, "pendente_pagamento"),
    ),
  });
  if (pendentes.length === 0) return null;

  const eventoIds = [...new Set(pendentes.map((i) => i.eventoId))];
  const [evs, lts] = await Promise.all([
    db.query.eventos.findMany({ where: inArray(eventos.id, eventoIds) }),
    db.query.lotes.findMany({ where: inArray(lotes.eventoId, eventoIds) }),
  ]);
  const eventoPorId = new Map(evs.map((e) => [e.id, e]));
  const lotesPorEvento = new Map<string, typeof lts>();
  for (const l of lts) {
    const arr = lotesPorEvento.get(l.eventoId) ?? [];
    arr.push(l);
    lotesPorEvento.set(l.eventoId, arr);
  }

  // só conta as que ainda dá para pagar (dentro do prazo do campeonato)
  const pagaveis = pendentes.filter((i) => {
    const ev = eventoPorId.get(i.eventoId);
    return ev
      ? dentroDoPrazoDePagamento(ev, lotesPorEvento.get(i.eventoId) ?? [])
      : false;
  });
  if (pagaveis.length === 0) return null;

  // prazo mais próximo entre as pendências — o que "aperta" primeiro
  const prazoMaisProximo = pagaveis
    .map((i) =>
      prazoDePagamento(
        eventoPorId.get(i.eventoId)!,
        lotesPorEvento.get(i.eventoId) ?? [],
      ),
    )
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const n = pagaveis.length;

  return (
    <Link
      href="/minhas-inscricoes"
      className="group block border-b border-amber-500/30 bg-amber-500/10 transition-colors hover:bg-amber-500/[0.16]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-center font-cond text-[13px] uppercase tracking-[0.04em] md:px-12">
        <span className="font-bold text-amber-400">
          {n === 1
            ? "1 inscrição aguardando pagamento"
            : `${n} inscrições aguardando pagamento`}
        </span>
        {prazoMaisProximo && (
          <span className="text-amber-200/80">
            · pague até {dataHora(prazoMaisProximo)}
          </span>
        )}
        <span className="text-white underline decoration-amber-400/60 underline-offset-2 group-hover:decoration-amber-400">
          Pagar agora →
        </span>
      </div>
    </Link>
  );
}
