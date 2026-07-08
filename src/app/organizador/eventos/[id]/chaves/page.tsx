import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { gerarChave, publicarChaves } from "../../actions";

const rotuloChave: Record<string, [string, string]> = {
  rascunho: ["Rascunho", "bg-amber-100 text-amber-700"],
  publicada: ["Publicada", "bg-blue-100 text-blue-700"],
  em_andamento: ["Em andamento", "bg-purple-100 text-purple-700"],
  concluida: ["Concluída", "bg-emerald-100 text-emerald-700"],
};

export default async function PaginaChaves({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const [cats, confirmadas] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
    }),
  ]);
  const todasChaves = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];
  const chavePorCategoria = new Map(todasChaves.map((c) => [c.categoriaId, c]));

  const contagem = new Map<string, number>();
  for (const i of confirmadas) {
    contagem.set(i.categoriaId, (contagem.get(i.categoriaId) ?? 0) + 1);
  }

  const comInscritos = cats.filter((c) => (contagem.get(c.id) ?? 0) > 0);
  const rascunhos = todasChaves.filter((c) => c.status === "rascunho").length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chaves — {evento.nome}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Categorias sem inscrições confirmadas ficam ocultas. Gere em
            rascunho, revise e publique — depois de publicada a chave não pode
            ser regenerada.
          </p>
        </div>
        {rascunhos > 0 && (
          <form action={publicarChaves.bind(null, evento.id)}>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Publicar {rascunhos} chave(s)
            </button>
          </form>
        )}
      </div>

      <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {comInscritos.map((c) => {
          const chave = chavePorCategoria.get(c.id);
          const qtd = contagem.get(c.id) ?? 0;
          const [rotulo, cor] = chave
            ? rotuloChave[chave.status]
            : ["Sem chave", "bg-zinc-100 text-zinc-500"];

          return (
            <li key={c.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-zinc-500">
                  {qtd} confirmado(s)
                  {qtd === 1 && " — insuficiente para gerar chave"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${cor}`}>
                  {rotulo}
                </span>
                {qtd >= 2 && (!chave || chave.status === "rascunho") && (
                  <form action={gerarChave.bind(null, evento.id, c.id)}>
                    <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
                      {chave ? "Regenerar" : "Gerar chave"}
                    </button>
                  </form>
                )}
                {chave && (
                  <Link
                    href={`/organizador/eventos/${evento.id}/chaves/${chave.id}`}
                    className="text-xs font-medium text-zinc-600 underline"
                  >
                    abrir
                  </Link>
                )}
              </div>
            </li>
          );
        })}
        {comInscritos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-zinc-500">
            Nenhuma categoria com inscrições confirmadas ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
