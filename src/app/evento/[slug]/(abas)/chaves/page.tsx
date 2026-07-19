import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes } from "@/db/schema";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { montarFilasDoEvento } from "@/lib/cronograma/fila";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { compararCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function AbaChaves({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dk = (await getDicionario()).chavesTab;

  const db = await getDb();
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, evento.id),
    orderBy: asc(categorias.nome),
  });

  const chavesPublicadas = cats.length
    ? (
        await db.query.chaves.findMany({
          where: inArray(
            chaves.categoriaId,
            cats.map((c) => c.id),
          ),
        })
      ).filter((c) => c.status !== "rascunho")
    : [];
  const catComChave = new Set(chavesPublicadas.map((c) => c.categoriaId));
  const catsPublicadas = cats.filter((c) => catComChave.has(c.id));

  // inscritos confirmados por categoria
  const confirmadas = catsPublicadas.length
    ? await db.query.inscricoes.findMany({
        where: and(
          eq(inscricoes.eventoId, evento.id),
          eq(inscricoes.status, "confirmada"),
        ),
        columns: { categoriaId: true },
      })
    : [];
  const inscritosPorCat = new Map<string, number>();
  for (const i of confirmadas) {
    inscritosPorCat.set(
      i.categoriaId,
      (inscritosPorCat.get(i.categoriaId) ?? 0) + 1,
    );
  }

  // ETA de início + tatame por categoria, derivados das filas das áreas
  const filas = await montarFilasDoEvento(db, evento.id);
  const agenda = new Map<string, { inicio: Date; area: string }>();
  for (const f of filas) {
    for (const item of f.fila) {
      const atual = agenda.get(item.categoria.id);
      if (!atual || item.horaEstimada < atual.inicio) {
        agenda.set(item.categoria.id, {
          inicio: item.horaEstimada,
          area: f.area.nome,
        });
      }
    }
  }

  // ordem canônica de exibição: classe → sexo (feminino primeiro) → faixa → peso
  const linhas = catsPublicadas
    .map((c) => ({
      c,
      inscritos: inscritosPorCat.get(c.id) ?? 0,
      ag: agenda.get(c.id) ?? null,
    }))
    .sort((a, b) => compararCategoriasExibicao(a.c, b.c));

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="disp text-[46px]">{dk.titulo}</h1>
        <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
          {linhas.length} {linhas.length === 1 ? dk.publicada : dk.publicadas}
        </span>
      </div>

      {linhas.length === 0 ? (
        <div className="border border-white/10 bg-surface px-6 py-16 text-center font-cond text-sm uppercase tracking-[0.06em] text-muted-3">
          {cats.length === 0 ? dk.vazioSemCat : dk.vazioSemChave}
        </div>
      ) : (
        <div className="border border-white/10">
          {/* CABEÇALHO */}
          <div className="hidden grid-cols-[minmax(0,1fr)_90px_140px_120px] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3 md:grid">
            <span>{dk.colDivisao}</span>
            <span className="text-right">{dk.colInscritos}</span>
            <span>{dk.colInicio}</span>
            <span>{dk.colTatame}</span>
          </div>
          {linhas.map(({ c, inscritos, ag }, i) => (
            <Link
              key={c.id}
              href={`/evento/${evento.slug}/chaves/${c.id}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-white/6 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[minmax(0,1fr)_90px_140px_120px] ${
                i % 2 === 1 ? "bg-white/[0.015]" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-[13px]">
                <span
                  className="h-[9px] w-[9px] shrink-0 -skew-x-9 border border-white/20"
                  style={{ background: corDaFaixa(c.faixa) }}
                />
                <span className="truncate font-cond text-[18px] font-semibold uppercase tracking-[0.02em]">
                  {c.nome}
                </span>
              </div>
              <span className="text-right font-cond text-sm tabular-nums text-muted-2 md:text-base">
                {inscritos}
              </span>
              <span className="font-cond text-sm tracking-[0.02em] text-text-2 max-md:col-span-2">
                {ag ? (
                  <span className="text-brand-soft">{quando(ag.inicio)}</span>
                ) : (
                  <span className="text-muted-3">{dk.aDefinir}</span>
                )}
              </span>
              <span className="font-cond text-sm uppercase tracking-[0.04em] text-muted-2 max-md:col-span-2">
                {ag ? ag.area : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-4 font-cond text-xs text-muted-3">{dk.nota}</p>
    </div>
  );
}
