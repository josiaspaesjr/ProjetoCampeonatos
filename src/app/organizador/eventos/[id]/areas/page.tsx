import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, chaves, eventos } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { montarFilaDaArea } from "@/lib/cronograma/fila";
import {
  criarArea,
  designarCategoria,
  excluirArea,
  removerCategoriaDaArea,
} from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

const hora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default async function PaginaAreas({
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

  const [todasAreas, semArea] = await Promise.all([
    db.query.areas.findMany({ where: eq(areas.eventoId, id), orderBy: asc(areas.ordem) }),
    db.query.categorias.findMany({
      where: and(eq(categorias.eventoId, id), isNull(categorias.areaId)),
      orderBy: asc(categorias.nome),
    }),
  ]);

  // só categorias com chave gerada entram na distribuição
  const chavesDoEvento = semArea.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, semArea.map((c) => c.id)),
      })
    : [];
  const comChave = new Set(chavesDoEvento.map((c) => c.categoriaId));
  const designaveis = semArea.filter((c) => comChave.has(c.id));

  const filas = await Promise.all(
    todasAreas.map((a) => montarFilaDaArea(db, a.id)),
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/organizador/eventos/${id}`} className="text-sm text-zinc-500 hover:underline">
          ← {evento.nome}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Áreas & Cronograma</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Distribua as categorias (com chave gerada) pelas áreas. A fila e os
          horários estimados se recalculam a cada luta encerrada.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <form action={criarArea.bind(null, id)} className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold">Nova área</p>
          <input name="nome" required placeholder="Área 1" className={inputCls} />
          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">Começa às</span>
            <input name="horaInicio" type="datetime-local" className={inputCls} />
          </label>
          <button className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Criar área
          </button>
        </form>

        <div className="col-span-2 rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold">
            Categorias sem área{" "}
            <span className="font-normal text-zinc-400">
              ({designaveis.length} com chave gerada)
            </span>
          </p>
          {designaveis.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Nada para distribuir — gere as chaves primeiro.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {designaveis.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{c.nome}</span>
                  <form action={designarCategoria.bind(null, id)} className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="categoriaId" value={c.id} />
                    <select name="areaId" required defaultValue="" className="rounded border border-zinc-200 px-2 py-1 text-xs">
                      <option value="" disabled>Área…</option>
                      {todasAreas.map((a) => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                    <button className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                      Designar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {filas.map((f) =>
          f ? (
            <div key={f.area.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold">{f.area.nome}</p>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/organizador/eventos/${id}/areas/${f.area.id}/placar`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    Operar placar
                  </Link>
                  <form action={excluirArea.bind(null, id, f.area.id)}>
                    <button className="text-xs text-red-500 hover:underline">excluir</button>
                  </form>
                </div>
              </div>

              {f.fila.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Fila vazia.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {f.fila.slice(0, 8).map((item, idx) => (
                    <li key={item.luta.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="mr-2 font-mono text-xs text-zinc-400">
                          {hora(item.horaEstimada)}
                        </span>
                        {item.pronta
                          ? `${f.atletas[item.luta.atleta1InscricaoId!]?.nome} × ${f.atletas[item.luta.atleta2InscricaoId!]?.nome}`
                          : "aguardando vencedores"}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {idx === 0 && item.pronta ? "próxima" : ""}
                      </span>
                    </li>
                  ))}
                  {f.fila.length > 8 && (
                    <li className="text-xs text-zinc-400">+ {f.fila.length - 8} lutas…</li>
                  )}
                </ul>
              )}

              <p className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-400">
                Categorias:{" "}
                {[...new Set(f.fila.map((i) => i.categoria.nome))].join(" · ") || "—"}
              </p>
              {[...new Set(f.fila.map((i) => i.categoria.id))].map((catId) => (
                <form key={catId} action={removerCategoriaDaArea.bind(null, id, catId)} className="mt-1 inline-block">
                  <button className="mr-3 text-xs text-zinc-400 hover:text-red-500 hover:underline">
                    remover {f.fila.find((i) => i.categoria.id === catId)?.categoria.nome.split(" / ").at(-1)}
                  </button>
                </form>
              ))}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
