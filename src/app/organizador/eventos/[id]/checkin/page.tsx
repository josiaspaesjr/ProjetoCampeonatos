import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
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
      <Link href={`/organizador/eventos/${id}`} className="text-sm text-zinc-500 hover:underline">
        ← {evento.nome}
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Check-in & Pesagem</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Escaneie o QR do atleta com a câmera do celular (abre direto a tela de
        pesagem) ou busque por nome / código.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          ["Confirmados", confirmadas.length],
          ["Check-in feito", feitos],
          ["Fora do peso", foraDoPeso],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{rotulo}</p>
            <p className="mt-1 text-3xl font-bold">{valor}</p>
          </div>
        ))}
      </div>

      <form method="GET" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Nome do atleta ou código (ex.: A1B2C3D4)"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
        />
        <button className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
          Buscar
        </button>
      </form>

      <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {resultados.map((i) => (
          <li key={i.id}>
            <Link
              href={`/organizador/eventos/${id}/checkin/${i.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50"
            >
              <div>
                <p className="text-sm font-medium">
                  {i.nomeAtleta}
                  <span className="ml-2 font-mono text-xs text-zinc-400">
                    {codigoCurto(i.id)}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">{nomeCategoria.get(i.categoriaId)}</p>
              </div>
              {i.checkinEm ? (
                i.foraDoPeso ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Fora do peso ({i.pesoAferidoKg}kg)
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    OK · {i.pesoAferidoKg}kg
                  </span>
                )
              ) : (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                  Aguardando
                </span>
              )}
            </Link>
          </li>
        ))}
        {resultados.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-zinc-500">
            Nenhum atleta encontrado{termo ? ` para "${q}"` : ""}.
          </li>
        )}
      </ul>
    </div>
  );
}
