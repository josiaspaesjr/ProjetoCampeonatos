import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
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
      <p className="text-sm text-muted-foreground">
        Escaneie o QR do atleta com a câmera do celular (abre direto a tela de
        pesagem) ou busque por nome / código.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          ["Confirmados", confirmadas.length],
          ["Check-in feito", feitos],
          ["Fora do peso", foraDoPeso],
        ].map(([rotulo, valor]) => (
          <Card key={rotulo}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{rotulo}</p>
              <p className="mt-1 text-3xl font-bold">{valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form method="GET" className="mt-6 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Nome do atleta ou código (ex.: A1B2C3D4)"
        />
        <Button>Buscar</Button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-xl border bg-card">
        {resultados.map((i) => (
          <li key={i.id}>
            <Link
              href={`/organizador/eventos/${id}/checkin/${i.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-accent"
            >
              <div>
                <p className="text-sm font-medium">
                  {i.nomeAtleta}
                  <span className="ml-2 font-cond text-xs text-muted-foreground">
                    {codigoCurto(i.id)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {nomeCategoria.get(i.categoriaId)}
                </p>
              </div>
              {i.checkinEm ? (
                i.foraDoPeso ? (
                  <Badge variant="destructive">Fora do peso ({i.pesoAferidoKg}kg)</Badge>
                ) : (
                  <Badge variant="success">OK · {i.pesoAferidoKg}kg</Badge>
                )
              ) : (
                <Badge variant="secondary">Aguardando</Badge>
              )}
            </Link>
          </li>
        ))}
        {resultados.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhum atleta encontrado{termo ? ` para "${q}"` : ""}.
          </li>
        )}
      </ul>
    </div>
  );
}
