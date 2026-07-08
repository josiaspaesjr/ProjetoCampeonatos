import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes, lotes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { CLASSES_IDADE } from "@/lib/categorias/cbjj";
import {
  criarLote,
  encerrarInscricoes,
  excluirCategoria,
  excluirLote,
  gerarCategoriasCbjj,
  publicarEvento,
} from "../actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

const moedaFmt: Record<string, Intl.NumberFormat> = {};
function dinheiro(centavos: number, moeda: string) {
  moedaFmt[moeda] ??= new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  });
  return moedaFmt[moeda].format(centavos / 100);
}

export default async function PaginaEvento({
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

  const [cats, lts, inscritos] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, id), orderBy: asc(lotes.inicio) }),
    db.query.inscricoes.findMany({ where: eq(inscricoes.eventoId, id) }),
  ]);

  const confirmadas = inscritos.filter((i) => i.status === "confirmada").length;

  return (
    <div className="space-y-10">
      {/* cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{evento.nome}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {new Date(`${evento.dataInicio}T12:00:00`).toLocaleDateString("pt-BR")}
            {evento.cidade ? ` · ${evento.cidade}/${evento.uf ?? ""}` : ""} · {evento.moeda}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            {evento.status}
          </span>
          {evento.status === "rascunho" && (
            <form action={publicarEvento.bind(null, evento.id)}>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                Publicar evento
              </button>
            </form>
          )}
          {evento.status === "publicado" && (
            <form action={encerrarInscricoes.bind(null, evento.id)}>
              <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100">
                Encerrar inscrições
              </button>
            </form>
          )}
          <Link
            href={`/organizador/eventos/${evento.id}/inscricoes`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Inscrições
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/areas`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Áreas
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/checkin`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Check-in
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/chaves`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Chaves →
          </Link>
        </div>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Inscrições confirmadas", confirmadas],
          ["Categorias", cats.length],
          ["Lotes", lts.length],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{rotulo}</p>
            <p className="mt-1 text-3xl font-bold">{valor}</p>
          </div>
        ))}
      </div>

      {/* lotes */}
      <section>
        <h2 className="text-lg font-bold">Lotes de inscrição</h2>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            {lts.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhum lote — crie ao menos um para publicar o evento.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {lts.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{l.nome}</p>
                      <p className="text-xs text-zinc-500">
                        {l.inicio.toLocaleDateString("pt-BR")} →{" "}
                        {l.fim.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {dinheiro(l.precoCentavos, evento.moeda)}
                        </p>
                        {l.precoSegundaInscricaoCentavos != null && (
                          <p className="text-xs text-zinc-500">
                            2ª inscrição:{" "}
                            {dinheiro(l.precoSegundaInscricaoCentavos, evento.moeda)}
                          </p>
                        )}
                      </div>
                      <form action={excluirLote.bind(null, evento.id, l.id)}>
                        <button className="text-xs text-red-500 hover:underline">
                          excluir
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            action={criarLote.bind(null, evento.id)}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-sm font-semibold">Novo lote</p>
            <div className="mt-3 space-y-3">
              <input name="nome" required placeholder="1º lote / Early bird" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-zinc-500">Preço ({evento.moeda})</span>
                  <input name="preco" type="number" step="0.01" min="1" required className={inputCls} />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">2ª inscrição (opcional)</span>
                  <input name="precoSegunda" type="number" step="0.01" min="0" className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-zinc-500">Início</span>
                  <input name="inicio" type="datetime-local" required className={inputCls} />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-500">Fim</span>
                  <input name="fim" type="datetime-local" required className={inputCls} />
                </label>
              </div>
              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Adicionar lote
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* categorias */}
      <section>
        <h2 className="text-lg font-bold">
          Categorias <span className="font-normal text-zinc-400">({cats.length})</span>
        </h2>

        <form
          action={gerarCategoriasCbjj.bind(null, evento.id)}
          className="mt-4 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <p className="text-sm font-semibold">Gerador de grade CBJJ</p>
          <p className="mt-1 text-xs text-zinc-500">
            Marque classes, sexos e faixas — o produto cartesiano com a tabela
            oficial de pesos vira a grade. Categorias já existentes com o mesmo
            nome não são duplicadas. Kids: crie manualmente (Fase 1).
          </p>

          <div className="mt-4 grid grid-cols-3 gap-6 text-sm">
            <fieldset>
              <legend className="text-xs font-medium uppercase text-zinc-400">Classes</legend>
              <div className="mt-2 space-y-1">
                {CLASSES_IDADE.map((c) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input type="checkbox" name="classes" value={c.id} defaultChecked={c.id === "adulto"} />
                    {c.nome}
                    <span className="text-xs text-zinc-400">
                      ({c.idadeMin}{c.idadeMax ? `–${c.idadeMax}` : "+"})
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-medium uppercase text-zinc-400">Sexo</legend>
              <div className="mt-2 space-y-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="sexos" value="masculino" defaultChecked /> Masculino
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="sexos" value="feminino" defaultChecked /> Feminino
                </label>
              </div>
              <label className="mt-4 flex items-center gap-2 font-medium">
                <input type="checkbox" name="incluirAbsoluto" /> Incluir absoluto
              </label>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-medium uppercase text-zinc-400">Faixas</legend>
              <div className="mt-2 space-y-1">
                {(["branca", "azul", "roxa", "marrom", "preta"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-2 capitalize">
                    <input type="checkbox" name="faixas" value={f} defaultChecked={f === "branca" || f === "azul"} />
                    {f}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Gerar categorias
          </button>
        </form>

        {cats.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-zinc-100 py-1.5">
                <span>{c.nome}</span>
                <form action={excluirCategoria.bind(null, evento.id, c.id)}>
                  <button className="text-xs text-red-500 hover:underline">excluir</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
