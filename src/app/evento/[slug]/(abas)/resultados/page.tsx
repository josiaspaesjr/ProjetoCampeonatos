import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";
import {
  quadroDeMedalhas,
  type PodioResolvido,
} from "@/lib/chaves/quadro-medalhas";
import { compararCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { EmBreve } from "@/components/evento/em-breve";

export default async function AbaResultados({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dr = (await getDicionario()).resultadosTab;

  const db = await getDb();
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, evento.id),
  });

  // só chave concluída tem pódio; as demais nem entram na página
  const chavesConcluidas = cats.length
    ? (
        await db.query.chaves.findMany({
          where: inArray(
            chaves.categoriaId,
            cats.map((c) => c.id),
          ),
        })
      ).filter((c) => c.status === "concluida")
    : [];

  // lutas e inscrições em lote — dentro de um laço por categoria isto seria
  // N+1 e derrubaria a página num evento com muitas divisões
  const lutasDasChaves = chavesConcluidas.length
    ? await db.query.lutas.findMany({
        where: inArray(
          lutas.chaveId,
          chavesConcluidas.map((c) => c.id),
        ),
      })
    : [];
  const lutasPorChave = new Map<string, typeof lutasDasChaves>();
  for (const l of lutasDasChaves) {
    const arr = lutasPorChave.get(l.chaveId);
    if (arr) arr.push(l);
    else lutasPorChave.set(l.chaveId, [l]);
  }

  const idsInscricoes = [
    ...new Set(
      lutasDasChaves.flatMap((l) =>
        [l.atleta1InscricaoId, l.atleta2InscricaoId].filter(
          (v): v is string => v !== null,
        ),
      ),
    ),
  ];
  const inscritos = idsInscricoes.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, idsInscricoes),
        columns: { id: true, nomeAtleta: true, academiaNome: true },
      })
    : [];
  const atletaPorId = new Map(
    inscritos.map((i) => [
      i.id,
      { nome: i.nomeAtleta, academia: i.academiaNome },
    ]),
  );
  const resolver = (id: string | null) => (id ? (atletaPorId.get(id) ?? null) : null);

  const catPorId = new Map(cats.map((c) => [c.id, c]));
  const linhas = chavesConcluidas
    .map((chave) => {
      const categoria = catPorId.get(chave.categoriaId);
      if (!categoria) return null;
      const podio = calcularPodioDaChave(
        chave,
        lutasPorChave.get(chave.id) ?? [],
      );
      const resolvido: PodioResolvido = {
        ouro: resolver(podio.primeiro),
        prata: resolver(podio.segundo),
        bronzes: podio.terceiros
          .map(resolver)
          .filter((a): a is { nome: string; academia: string | null } => !!a),
      };
      return { categoria, podio: resolvido };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => compararCategoriasExibicao(a.categoria, b.categoria));

  if (linhas.length === 0) {
    return (
      <div className="px-6 pb-20 pt-10 md:px-12">
        <EmBreve
          selo={dr.titulo}
          titulo={dr.vazioTitulo}
          descricao={dr.vazioDesc}
        />
      </div>
    );
  }

  const quadro = quadroDeMedalhas(
    linhas.map((l) => l.podio),
    dr.semAcademia,
  );

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="disp text-[38px] md:text-[46px]">{dr.titulo}</h1>
        <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
          {linhas.length}{" "}
          {linhas.length === 1 ? dr.concluida : dr.concluidas}
        </span>
      </div>

      {/* PÓDIOS POR DIVISÃO */}
      <div className="border border-white/10">
        <div className="hidden grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3 md:grid">
          <span>{dr.colDivisao}</span>
          <span>{dr.ouro}</span>
          <span>{dr.prata}</span>
          <span>{dr.bronze}</span>
        </div>
        {linhas.map(({ categoria, podio }, i) => (
          <Link
            key={categoria.id}
            href={`/evento/${evento.slug}/chaves/${categoria.id}`}
            className={`grid grid-cols-1 gap-x-4 gap-y-2 border-b border-white/6 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] ${
              i % 2 === 1 ? "bg-white/[0.015]" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-[13px]">
              <span
                className="h-[9px] w-[9px] shrink-0 -skew-x-9 border border-white/20"
                style={{ background: corDaFaixa(categoria.faixa) }}
              />
              <span className="truncate font-cond text-[17px] font-semibold uppercase tracking-[0.02em]">
                {categoria.nome}
              </span>
            </div>
            <Medalhista rotulo={dr.ouro} atleta={podio.ouro} cor="#F1C85A" />
            <Medalhista rotulo={dr.prata} atleta={podio.prata} cor="#CFD7DF" />
            <Medalhista
              rotulo={dr.bronze}
              atleta={podio.bronzes[0] ?? null}
              extra={podio.bronzes[1] ?? null}
              cor="#D5894F"
            />
          </Link>
        ))}
      </div>

      {/* QUADRO DE MEDALHAS */}
      <section className="mt-10">
        <h2 className="disp text-[26px]">{dr.quadroTitulo}</h2>
        <p className="mb-4 text-sm text-muted-2">{dr.quadroDesc}</p>
        <div className="border border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3">
            <span>{dr.academia}</span>
            <span className="text-right">{dr.ouro}</span>
            <span className="text-right">{dr.prata}</span>
            <span className="text-right">{dr.bronze}</span>
            <span className="text-right">{dr.total}</span>
          </div>
          {quadro.map((l, i) => (
            <div
              key={l.academia}
              className={`grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-3 border-b border-white/6 px-5 py-3 last:border-b-0 ${
                i % 2 === 1 ? "bg-white/[0.015]" : ""
              }`}
            >
              <span className="truncate font-cond text-[16px] uppercase tracking-[0.02em]">
                {l.academia}
              </span>
              <span className="tnum text-right font-cond text-[15px] text-[#F1C85A]">
                {l.ouro}
              </span>
              <span className="tnum text-right font-cond text-[15px] text-[#CFD7DF]">
                {l.prata}
              </span>
              <span className="tnum text-right font-cond text-[15px] text-[#D5894F]">
                {l.bronze}
              </span>
              <span className="disp tnum text-right text-[18px]">{l.total}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Uma posição do pódio na linha da divisão. O rótulo (1º/2º/3º) aparece só no
 * mobile, onde não há cabeçalho de coluna para dizer o que é cada campo.
 */
function Medalhista({
  rotulo,
  atleta,
  extra,
  cor,
}: {
  rotulo: string;
  atleta: { nome: string; academia: string | null } | null;
  /** segundo terceiro-lugar (artes marciais têm dois bronzes) */
  extra?: { nome: string; academia: string | null } | null;
  cor: string;
}) {
  if (!atleta) {
    return <span className="font-cond text-sm text-muted-3">—</span>;
  }
  return (
    <div className="min-w-0">
      <span
        className="mr-1.5 font-cond text-[11px] uppercase tracking-[0.08em] md:hidden"
        style={{ color: cor }}
      >
        {rotulo}
      </span>
      <span className="truncate text-sm font-medium">{atleta.nome}</span>
      {atleta.academia && (
        <div className="truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
          {atleta.academia}
        </div>
      )}
      {extra && (
        <div className="mt-1.5 border-t border-white/6 pt-1.5">
          <span className="truncate text-sm font-medium">{extra.nome}</span>
          {extra.academia && (
            <div className="truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
              {extra.academia}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
