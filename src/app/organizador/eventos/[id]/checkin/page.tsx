import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, inscricoes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { codigoCurto } from "@/lib/checkin/qr";

export default async function PaginaCheckin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const ck = dic.admin.checkin;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const [confirmadas, cats] = await Promise.all([
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
      orderBy: asc(inscricoes.nomeAtleta),
    }),
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
  ]);
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  const termo = q.trim().toLowerCase();
  const resultados = termo
    ? confirmadas.filter(
        (i) =>
          i.nomeAtleta.toLowerCase().includes(termo) ||
          i.id.toLowerCase().startsWith(termo) ||
          codigoCurto(i.id).toLowerCase() === termo,
      )
    : confirmadas;

  const feitos = confirmadas.filter((i) => i.checkinEm).length;
  const foraDoPeso = confirmadas.filter((i) => i.foraDoPeso).length;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{ck.intro}</p>

      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-4">
        {[
          [ck.confirmados, confirmadas.length],
          [ck.checkinFeito, feitos],
          [ck.foraDoPeso, foraDoPeso],
        ].map(([rotulo, valor]) => (
          <Card key={rotulo}>
            <CardContent className="p-3.5 sm:p-5">
              <p className="text-xs text-muted-foreground sm:text-sm">{rotulo}</p>
              <p className="mt-1 text-2xl font-bold sm:text-3xl">{valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form method="GET" className="mt-6 flex gap-2">
        <Input name="q" defaultValue={q} placeholder={ck.buscarPlaceholder} />
        <Button>{ck.buscar}</Button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-xl border bg-card">
        {resultados.map((i) => (
          <li key={i.id}>
            <Link
              href={`/organizador/eventos/${id}/checkin/${i.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {i.nomeAtleta}
                  <span className="ml-2 font-cond text-xs text-muted-foreground">
                    {codigoCurto(i.id)}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {nomeCategoria.get(i.categoriaId)}
                </p>
              </div>
              <span className="shrink-0">
                {i.checkinEm ? (
                  i.foraDoPeso ? (
                    <Badge variant="destructive">
                      {ck.foraDoPeso} ({i.pesoAferidoKg}kg)
                    </Badge>
                  ) : (
                    <Badge variant="success">OK · {i.pesoAferidoKg}kg</Badge>
                  )
                ) : (
                  <Badge variant="secondary">{ck.aguardando}</Badge>
                )}
              </span>
            </Link>
          </li>
        ))}
        {resultados.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            {dic.atletas.nenhumEncontrado}
            {termo ? ` ${ck.para} "${q}"` : ""}.
          </li>
        )}
      </ul>
    </div>
  );
}
