import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { calcularPodio } from "@/lib/bracket";
import { montarChaveEngine } from "@/lib/chaves/persistencia";
import { BracketView, type AtletaInfo } from "@/components/bracket-view";
import { lancarResultado } from "../../../actions";

export default async function PaginaChave({
  params,
}: {
  params: Promise<{ id: string; chaveId: string }>;
}) {
  const { id, chaveId } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const chave = await db.query.chaves.findFirst({ where: eq(chaves.id, chaveId) });
  if (!chave) notFound();

  const [categoria, linhas] = await Promise.all([
    db.query.categorias.findFirst({ where: eq(categorias.id, chave.categoriaId) }),
    db.query.lutas.findMany({ where: eq(lutas.chaveId, chaveId) }),
  ]);

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
    <div>
      <Link
        href={`/organizador/eventos/${id}/chaves`}
        className="text-sm text-zinc-500 hover:underline"
      >
        ← Todas as chaves
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">{categoria?.nome}</h1>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          {chave.status} · seed {chave.seedSorteio.slice(0, 8)}
        </span>
      </div>

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

      {chave.status === "rascunho" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Chave em rascunho — publique na lista de chaves para liberar o
          lançamento de resultados.
        </p>
      )}

      <div className="mt-6">
        <BracketView
          lutas={linhas}
          atletas={atletas}
          acaoResultado={
            chave.status === "publicada" || chave.status === "em_andamento"
              ? lancarResultado.bind(null, evento.id, chave.id)
              : undefined
          }
        />
      </div>
    </div>
  );
}
