import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";
import { PublicShell } from "@/components/public-shell";

export default async function PaginaPublicaEvento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), ne(eventos.status, "rascunho")),
  });
  if (!evento) notFound();

  const agora = new Date();
  const [cats, todosLotes, confirmadas] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, evento.id),
      orderBy: asc(categorias.nome),
    }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, evento.id), orderBy: asc(lotes.inicio) }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, evento.id), eq(inscricoes.status, "confirmada")),
    }),
  ]);

  const chavesPublicadas = cats.length
    ? (
        await db.query.chaves.findMany({
          where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
        })
      ).filter((c) => c.status !== "rascunho")
    : [];
  const chavePorCategoria = new Map(chavesPublicadas.map((c) => [c.categoriaId, c]));

  const loteVigente = todosLotes.find((l) => l.inicio <= agora && agora <= l.fim);
  const inscricoesAbertas =
    evento.status === "publicado" &&
    loteVigente &&
    (!evento.inscricoesFecham || agora <= evento.inscricoesFecham);

  const porCategoria = new Map<string, number>();
  for (const i of confirmadas) {
    porCategoria.set(i.categoriaId, (porCategoria.get(i.categoriaId) ?? 0) + 1);
  }

  const porAcademia = new Map<string, number>();
  for (const i of confirmadas) {
    const nome = i.academiaNome ?? "Sem equipe";
    porAcademia.set(nome, (porAcademia.get(nome) ?? 0) + 1);
  }

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: evento.moeda });

  return (
    <PublicShell>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8">
        <h1 className="text-3xl font-bold">{evento.nome}</h1>
        <p className="mt-2 text-zinc-500">
          {new Date(`${evento.dataInicio}T12:00:00`).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          {evento.cidade ? ` · ${evento.cidade}/${evento.uf ?? ""}` : ""}
        </p>
        {evento.endereco && <p className="text-sm text-zinc-500">{evento.endereco}</p>}
        {evento.descricao && <p className="mt-4 whitespace-pre-line">{evento.descricao}</p>}

        <div className="mt-4">
          <Link
            href={`/evento/${evento.slug}/cronograma`}
            className="text-sm font-medium text-emerald-700 underline"
          >
            Cronograma ao vivo →
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {inscricoesAbertas ? (
            <>
              <Link
                href={`/evento/${evento.slug}/inscricao`}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
              >
                Inscrever-se — {fmt.format(loteVigente.precoCentavos / 100)}
              </Link>
              <div className="text-sm text-zinc-500">
                <p>{loteVigente.nome}</p>
                {loteVigente.precoSegundaInscricaoCentavos != null && (
                  <p>
                    2ª inscrição (absoluto):{" "}
                    {fmt.format(loteVigente.precoSegundaInscricaoCentavos / 100)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-500">
              Inscrições encerradas
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <section className="col-span-2">
          <h2 className="text-lg font-bold">
            Categorias <span className="font-normal text-zinc-400">({cats.length})</span>
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white px-4 text-sm">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.nome}</span>
                <span className="flex items-center gap-3 text-zinc-400">
                  {porCategoria.get(c.id) ?? 0} inscrito(s)
                  {chavePorCategoria.has(c.id) && (
                    <Link
                      href={`/evento/${evento.slug}/chaves/${c.id}`}
                      className="font-medium text-emerald-700 underline"
                    >
                      chave
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">
            Equipes <span className="font-normal text-zinc-400">({porAcademia.size})</span>
          </h2>
          <ul className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 text-sm">
            {[...porAcademia.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([nome, qtd]) => (
                <li key={nome} className="flex items-center justify-between border-b border-zinc-100 py-2 last:border-0">
                  <span>{nome}</span>
                  <span className="text-zinc-400">{qtd}</span>
                </li>
              ))}
            {porAcademia.size === 0 && (
              <li className="py-3 text-zinc-400">Seja o primeiro a se inscrever!</li>
            )}
          </ul>
        </section>
      </div>
    </PublicShell>
  );
}
