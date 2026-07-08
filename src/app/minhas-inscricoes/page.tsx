import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categorias,
  eventos,
  inscricoes,
  pagamentoInscricoes,
} from "@/db/schema";
import { PublicShell } from "@/components/public-shell";
import { codigoCurto, gerarQrDataUrl, urlCheckin } from "@/lib/checkin/qr";
import { getAtletaAtual } from "@/lib/sessao";

const rotuloStatus: Record<string, [string, string]> = {
  pendente_pagamento: ["Aguardando pagamento", "text-amber-600"],
  confirmada: ["Confirmada", "text-emerald-600"],
  cancelada: ["Cancelada", "text-zinc-400"],
  reembolsada: ["Reembolsada", "text-zinc-400"],
};

export default async function MinhasInscricoes() {
  const atleta = await getAtletaAtual();

  if (!atleta) {
    return (
      <PublicShell>
        <p className="text-zinc-500">
          Você ainda não tem inscrições —{" "}
          <Link href="/" className="underline">
            encontre um evento
          </Link>{" "}
          para começar.
        </p>
      </PublicShell>
    );
  }

  const db = await getDb();
  const minhas = await db.query.inscricoes.findMany({
    where: eq(inscricoes.usuarioId, atleta.id),
    orderBy: desc(inscricoes.criadoEm),
  });

  const [cats, evts, vinculos] = await Promise.all([
    minhas.length
      ? db.query.categorias.findMany({
          where: inArray(categorias.id, minhas.map((i) => i.categoriaId)),
        })
      : [],
    minhas.length
      ? db.query.eventos.findMany({
          where: inArray(eventos.id, minhas.map((i) => i.eventoId)),
        })
      : [],
    minhas.length
      ? db.query.pagamentoInscricoes.findMany({
          where: inArray(pagamentoInscricoes.inscricaoId, minhas.map((i) => i.id)),
        })
      : [],
  ]);
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));
  const eventoPorId = new Map(evts.map((e) => [e.id, e]));
  const pagamentoPorInscricao = new Map(
    vinculos.map((v) => [v.inscricaoId, v.pagamentoId]),
  );

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

  return (
    <PublicShell>
      <h1 className="text-2xl font-bold">Minhas inscrições</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {atleta.nome} · {atleta.email}
      </p>

      <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {minhas.map((i) => {
          const evento = eventoPorId.get(i.eventoId);
          const [rotulo, cor] = rotuloStatus[i.status] ?? [i.status, ""];
          return (
            <li key={i.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                {qrPorInscricao.has(i.id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrPorInscricao.get(i.id)}
                    alt="QR de check-in"
                    className="h-20 w-20 shrink-0 rounded-lg border border-zinc-200"
                  />
                )}
                <div>
                  <p className="font-medium">{evento?.nome}</p>
                  <p className="text-sm text-zinc-500">
                    {nomeCategoria.get(i.categoriaId)}
                  </p>
                  {qrPorInscricao.has(i.id) && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Check-in: mostre o QR na pesagem · código{" "}
                      <span className="font-mono">{codigoCurto(i.id)}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${cor}`}>{rotulo}</p>
                {i.status === "pendente_pagamento" &&
                  pagamentoPorInscricao.has(i.id) && (
                    <Link
                      href={`/checkout/${pagamentoPorInscricao.get(i.id)}`}
                      className="text-xs text-zinc-500 underline"
                    >
                      pagar agora
                    </Link>
                  )}
              </div>
            </li>
          );
        })}
        {minhas.length === 0 && (
          <li className="px-5 py-8 text-center text-zinc-500">
            Nenhuma inscrição ainda.
          </li>
        )}
      </ul>
    </PublicShell>
  );
}
