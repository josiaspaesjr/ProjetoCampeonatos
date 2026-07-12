import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes } from "@/db/schema";
import { getEventoPublico } from "@/lib/evento-publico";
import { CategoriasFiltro } from "../categorias-filtro";

export default async function AbaCategorias({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;

  const db = await getDb();
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, evento.id),
    orderBy: asc(categorias.nome),
  });
  const catIds = cats.map((c) => c.id);

  const [confirmadas, chavesRows] = await Promise.all([
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, evento.id),
        eq(inscricoes.status, "confirmada"),
      ),
      columns: { categoriaId: true },
    }),
    catIds.length
      ? db.query.chaves.findMany({ where: inArray(chaves.categoriaId, catIds) })
      : Promise.resolve([]),
  ]);

  const porCategoria = new Map<string, number>();
  for (const i of confirmadas) {
    porCategoria.set(i.categoriaId, (porCategoria.get(i.categoriaId) ?? 0) + 1);
  }
  const chavePublicada = new Set(
    chavesRows.filter((c) => c.status !== "rascunho").map((c) => c.categoriaId),
  );

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-[18px] flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="disp text-[40px] md:text-[54px]">Categorias</h1>
        <span className="font-cond text-[17px] uppercase tracking-[0.06em] text-muted-2">
          {cats.length} disponíve{cats.length === 1 ? "l" : "is"}
        </span>
      </div>

      {cats.length === 0 ? (
        <p className="border border-white/10 bg-surface px-6 py-12 text-center font-cond text-[14px] uppercase tracking-[0.04em] text-muted-3">
          As categorias aparecem aqui assim que o organizador montar a grade.
        </p>
      ) : (
        <CategoriasFiltro
          categorias={cats.map((c) => ({
            id: c.id,
            nome: c.nome,
            faixa: c.faixa,
            classeIdade: c.classeIdade,
            sexo: c.sexo,
            inscritos: porCategoria.get(c.id) ?? 0,
            chaveUrl: chavePublicada.has(c.id)
              ? `/evento/${evento.slug}/chaves/${c.id}`
              : null,
            preco: c.precoCentavos != null ? fmt.format(c.precoCentavos / 100) : null,
          }))}
        />
      )}
    </div>
  );
}
