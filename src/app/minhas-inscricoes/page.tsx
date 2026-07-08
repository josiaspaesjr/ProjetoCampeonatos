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
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { codigoCurto, gerarQrDataUrl, urlCheckin } from "@/lib/checkin/qr";
import { getAtletaAtual } from "@/lib/sessao";

const rotuloStatus: Record<string, [string, BadgeProps["variant"]]> = {
  pendente_pagamento: ["Aguardando pagamento", "warning"],
  confirmada: ["Confirmada", "success"],
  cancelada: ["Cancelada", "secondary"],
  reembolsada: ["Reembolsada", "secondary"],
};

export default async function MinhasInscricoes() {
  const atleta = await getAtletaAtual();

  if (!atleta) {
    return (
      <PublicShell>
        <p className="text-muted-foreground">
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
      <p className="mt-1 text-sm text-muted-foreground">
        {atleta.nome} · {atleta.email}
      </p>

      <ul className="mt-6 divide-y divide-border rounded-xl border bg-card">
        {minhas.map((i) => {
          const evento = eventoPorId.get(i.eventoId);
          const [rotulo, variante] = rotuloStatus[i.status] ?? [i.status, "outline" as const];
          return (
            <li key={i.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                {qrPorInscricao.has(i.id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrPorInscricao.get(i.id)}
                    alt="QR de check-in"
                    className="h-20 w-20 shrink-0 rounded-lg border"
                  />
                )}
                <div>
                  <p className="font-medium">{evento?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {nomeCategoria.get(i.categoriaId)}
                  </p>
                  {qrPorInscricao.has(i.id) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Check-in: mostre o QR na pesagem · código{" "}
                      <span className="font-mono">{codigoCurto(i.id)}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={variante}>{rotulo}</Badge>
                {i.status === "pendente_pagamento" &&
                  pagamentoPorInscricao.has(i.id) && (
                    <p className="mt-1">
                      <Link
                        href={`/checkout/${pagamentoPorInscricao.get(i.id)}`}
                        className="text-xs text-muted-foreground underline"
                      >
                        pagar agora
                      </Link>
                    </p>
                  )}
              </div>
            </li>
          );
        })}
        {minhas.length === 0 && (
          <li className="px-5 py-8 text-center text-muted-foreground">
            Nenhuma inscrição ainda.
          </li>
        )}
      </ul>
    </PublicShell>
  );
}
