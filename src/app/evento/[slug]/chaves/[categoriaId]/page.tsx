import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";
import { calcularPodio } from "@/lib/bracket";
import { montarChaveEngine } from "@/lib/chaves/persistencia";
import { BracketView, type AtletaInfo } from "@/components/bracket-view";
import { PublicShell } from "@/components/public-shell";

export default async function ChavePublica({
  params,
}: {
  params: Promise<{ slug: string; categoriaId: string }>;
}) {
  const { slug, categoriaId } = await params;
  const db = await getDb();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), ne(eventos.status, "rascunho")),
  });
  if (!evento) notFound();

  const categoria = await db.query.categorias.findFirst({
    where: and(eq(categorias.id, categoriaId), eq(categorias.eventoId, evento.id)),
  });
  if (!categoria) notFound();

  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  // chave em rascunho é privada do organizador
  if (!chave || chave.status === "rascunho") notFound();

  const linhas = await db.query.lutas.findMany({
    where: eq(lutas.chaveId, chave.id),
  });
  const idsInscricoes = [
    ...new Set(
      linhas.flatMap((l) =>
        [l.atleta1InscricaoId, l.atleta2InscricaoId].filter(
          (v): v is string => v !== null,
        ),
      ),
    ),
  ];
  const inscritos = idsInscricoes.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, idsInscricoes),
      })
    : [];
  const atletas: Record<string, AtletaInfo> = Object.fromEntries(
    inscritos.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
  );

  const podio =
    chave.status === "concluida"
      ? calcularPodio(montarChaveEngine(chave, linhas))
      : null;

  return (
    <PublicShell>
      <Link href={`/evento/${evento.slug}`} className="text-sm text-zinc-500 hover:underline">
        ← {evento.nome}
      </Link>
      <h1 className="mt-2 text-xl font-bold">{categoria.nome}</h1>

      {podio && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800">Pódio</p>
          <ol className="mt-2 space-y-1 text-sm text-emerald-900">
            <li>🥇 {podio.primeiro && atletas[podio.primeiro]?.nome}</li>
            <li>🥈 {podio.segundo && atletas[podio.segundo]?.nome}</li>
            {podio.terceiros.map((t) => (
              <li key={t}>🥉 {atletas[t]?.nome}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6">
        <BracketView lutas={linhas} atletas={atletas} />
      </div>
    </PublicShell>
  );
}
