import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inscricoes } from "@/db/schema";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import { LutasLista, type LutaItem } from "@/components/evento/lutas-lista";

export default async function AbaLutas({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dl = (await getDicionario()).lutasTab;

  const db = await getDb();
  const [cronograma, confirmadas] = await Promise.all([
    montarCronogramaDoEvento(db, evento.id, evento.dataInicio),
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, evento.id),
        eq(inscricoes.status, "confirmada"),
      ),
      columns: { nomeAtleta: true, academiaNome: true },
    }),
  ]);

  // academia por nome (para permitir busca por academia sem inflar o cronograma)
  const academiaPorNome = new Map<string, string>();
  for (const i of confirmadas) {
    if (i.academiaNome) academiaPorNome.set(i.nomeAtleta, i.academiaNome);
  }

  // achata o cronograma em uma lista única de lutas (com contexto de área)
  const itens: LutaItem[] = cronograma.flatMap((area) =>
    area.categorias.flatMap((cat) =>
      cat.lutas.map((luta) => ({
        area: area.nome,
        luta,
        catTitulo: cat.titulo,
        catSubtitulo: cat.subtitulo,
        academia1: academiaPorNome.get(luta.a1) ?? null,
        academia2: academiaPorNome.get(luta.a2) ?? null,
      })),
    ),
  );
  const areasNomes = cronograma.map((a) => a.nome);

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6">
        <h1 className="disp text-[46px]">{dl.titulo}</h1>
        <p className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
          {dl.subtitulo}
        </p>
      </div>
      <LutasLista itens={itens} areas={areasNomes} />
    </div>
  );
}
