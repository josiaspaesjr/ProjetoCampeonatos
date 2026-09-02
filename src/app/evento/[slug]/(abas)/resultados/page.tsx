import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";
import { quadroDeMedalhas } from "@/lib/chaves/quadro-medalhas";
import { compararCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { EmBreve } from "@/components/evento/em-breve";
import {
  ResultadosAbas,
  type Medalhista,
  type PodioDivisao,
} from "@/components/evento/resultados-abas";

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
  const atletaPorId = new Map<string, Medalhista>(
    inscritos.map((i) => [
      i.id,
      { nome: i.nomeAtleta, academia: i.academiaNome },
    ]),
  );
  const resolver = (id: string | null) =>
    id ? (atletaPorId.get(id) ?? null) : null;

  const catPorId = new Map(cats.map((c) => [c.id, c]));
  const comCategoria = chavesConcluidas
    .map((chave) => {
      const categoria = catPorId.get(chave.categoriaId);
      if (!categoria) return null;
      const podio = calcularPodioDaChave(
        chave,
        lutasPorChave.get(chave.id) ?? [],
      );
      return {
        categoria,
        podio: {
          categoriaId: categoria.id,
          nome: categoria.nome,
          faixa: categoria.faixa,
          ouro: resolver(podio.primeiro),
          prata: resolver(podio.segundo),
          bronzes: podio.terceiros
            .map(resolver)
            .filter((a): a is Medalhista => a !== null),
        } satisfies PodioDivisao,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => compararCategoriasExibicao(a.categoria, b.categoria));

  const podios = comCategoria.map((x) => x.podio);

  if (podios.length === 0) {
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

  const quadro = quadroDeMedalhas(podios, dr.semAcademia);

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="disp text-[38px] md:text-[46px]">{dr.titulo}</h1>
        <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
          {podios.length} {podios.length === 1 ? dr.concluida : dr.concluidas}
        </span>
      </div>

      <ResultadosAbas podios={podios} quadro={quadro} slug={evento.slug} />
    </div>
  );
}
