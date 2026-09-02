import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inscricoes } from "@/db/schema";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import { blocosPorGrupo } from "@/lib/cronograma/blocos";
import { BlocosHorario } from "@/components/cronograma/blocos-horario";
import { LutasLista, type LutaItem } from "@/components/evento/lutas-lista";

export default async function AbaCronograma({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dic = await getDicionario();
  const dcr = dic.cronogramaTab;
  const dbl = dic.blocosHorario;

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
  // evento com mais de um dia distinto → mostra a data em cada luta
  const multiDia = new Set(itens.map((i) => i.luta.data)).size > 1;
  // o horário publicado é por divisão (idade·sexo·faixa), não por luta
  const blocos = blocosPorGrupo(cronograma);

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="disp text-[38px] md:text-[46px]">{dcr.titulo}</h1>
          <p className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
            {dcr.subtitulo}
          </p>
        </div>
        <Link
          href={`/evento/${evento.slug}/telao`}
          className="shrink-0 border border-white/16 px-4 py-2.5 font-cond text-sm font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/30"
        >
          {dcr.modoTelao}
        </Link>
      </div>
      <section className="mb-10">
        <h2 className="disp mb-3 text-[26px]">{dbl.titulo}</h2>
        <BlocosHorario blocos={blocos} multiDia={multiDia} />
      </section>

      <h2 className="disp mb-3 text-[26px]">{dbl.verLutas}</h2>
      <LutasLista itens={itens} areas={areasNomes} multiDia={multiDia} />
    </div>
  );
}
