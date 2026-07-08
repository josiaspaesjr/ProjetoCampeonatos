import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import {
  cancelarInscricao,
  fundirCategorias,
  inscricaoManual,
  moverInscricao,
  reembolsarInscricao,
} from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

const rotuloStatus: Record<string, [string, string]> = {
  pendente_pagamento: ["Pendente", "bg-amber-100 text-amber-700"],
  confirmada: ["Confirmada", "bg-emerald-100 text-emerald-700"],
  cancelada: ["Cancelada", "bg-zinc-100 text-zinc-500"],
  reembolsada: ["Reembolsada", "bg-zinc-100 text-zinc-500"],
};

export default async function PaginaInscricoes({
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

  const [lista, cats] = await Promise.all([
    db.query.inscricoes.findMany({
      where: eq(inscricoes.eventoId, id),
      orderBy: desc(inscricoes.criadoEm),
    }),
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
  ]);
  const abertas = cats.filter((c) => c.status === "aberta");
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  const ativasPorCategoria = new Map<string, number>();
  for (const i of lista) {
    if (i.status === "confirmada" || i.status === "pendente_pagamento") {
      ativasPorCategoria.set(
        i.categoriaId,
        (ativasPorCategoria.get(i.categoriaId) ?? 0) + 1,
      );
    }
  }
  const esvaziadas = abertas.filter(
    (c) => (ativasPorCategoria.get(c.id) ?? 0) > 0 &&
      (ativasPorCategoria.get(c.id) ?? 0) < c.minInscritos,
  );

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/organizador/eventos/${id}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {evento.nome}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Inscrições <span className="font-normal text-zinc-400">({lista.length})</span>
        </h1>
      </div>

      {esvaziadas.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-800">
            Categorias abaixo do mínimo de inscritos
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Funda em outra categoria (move os atletas e fecha a origem) ou
            reembolse os inscritos.
          </p>
          <ul className="mt-3 space-y-2">
            {esvaziadas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {c.nome}{" "}
                  <span className="text-amber-700">
                    ({ativasPorCategoria.get(c.id)} de {c.minInscritos} mín.)
                  </span>
                </span>
                <form action={fundirCategorias.bind(null, id, c.id)} className="flex items-center gap-2">
                  <select name="destinoId" required className="rounded border border-amber-300 bg-white px-2 py-1 text-xs">
                    <option value="">Fundir em…</option>
                    {abertas
                      .filter((d) => d.id !== c.id && d.sexo === c.sexo)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome}
                        </option>
                      ))}
                  </select>
                  <button className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500">
                    Fundir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {lista.map((i) => {
            const [rotulo, cor] = rotuloStatus[i.status] ?? [i.status, ""];
            const ativa = i.status === "confirmada" || i.status === "pendente_pagamento";
            return (
              <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {i.nomeAtleta}
                    <span className="ml-2 font-normal capitalize text-zinc-400">
                      {i.faixa}
                      {i.academiaNome ? ` · ${i.academiaNome}` : ""}
                    </span>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {nomeCategoria.get(i.categoriaId)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cor}`}>
                    {rotulo}
                  </span>

                  {ativa && (
                    <form action={moverInscricao.bind(null, id, i.id)} className="flex items-center gap-1">
                      <select name="categoriaId" required defaultValue="" className="w-44 rounded border border-zinc-200 px-1.5 py-1 text-xs">
                        <option value="" disabled>
                          Mover para…
                        </option>
                        {abertas
                          .filter((c) => c.id !== i.categoriaId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </select>
                      <button className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                        OK
                      </button>
                    </form>
                  )}

                  {i.status === "pendente_pagamento" && (
                    <form action={cancelarInscricao.bind(null, id, i.id)}>
                      <button className="text-xs text-red-500 hover:underline">cancelar</button>
                    </form>
                  )}
                  {i.status === "confirmada" && (
                    <form action={reembolsarInscricao.bind(null, id, i.id)}>
                      <button className="text-xs text-red-500 hover:underline">reembolsar</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
          {lista.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-zinc-500">
              Nenhuma inscrição ainda.
            </li>
          )}
        </ul>
      </section>

      <section className="max-w-2xl">
        <h2 className="text-lg font-bold">Inscrição manual</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Para atleta que pagou por fora (dinheiro, isenção) — entra direto como
          confirmada e fica registrada na auditoria.
        </p>
        <form
          action={inscricaoManual.bind(null, id)}
          className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <input name="nome" required placeholder="Nome completo" className={inputCls} />
            <input name="email" type="email" required placeholder="E-mail" className={inputCls} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <input name="dataNascimento" type="date" required className={inputCls} />
            <select name="sexo" required defaultValue="" className={inputCls}>
              <option value="" disabled>Sexo</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
            <select name="faixa" required defaultValue="" className={inputCls}>
              <option value="" disabled>Faixa</option>
              {["branca", "azul", "roxa", "marrom", "preta"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input name="academia" placeholder="Academia" className={inputCls} />
          </div>
          <select name="categoriaId" required defaultValue="" className={inputCls}>
            <option value="" disabled>Categoria</option>
            {abertas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Inscrever manualmente
          </button>
        </form>
      </section>
    </div>
  );
}
