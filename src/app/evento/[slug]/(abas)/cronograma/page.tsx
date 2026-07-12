import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import { CronogramaAreasPublico } from "@/components/evento/cronograma-areas-publico";

export default async function AbaCronograma({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dcr = (await getDicionario()).cronogramaTab;

  const db = await getDb();
  const cronograma = await montarCronogramaDoEvento(db, evento.id, evento.dataInicio);

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
      <CronogramaAreasPublico cronograma={cronograma} />
    </div>
  );
}
