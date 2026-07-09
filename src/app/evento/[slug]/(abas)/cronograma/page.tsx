import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getEventoPublico } from "@/lib/evento-publico";
import { montarFilasDoEvento } from "@/lib/cronograma/fila";
import { CronogramaGrade } from "@/components/cronograma-grade";

export default async function AbaCronograma({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;

  const db = await getDb();
  const filas = await montarFilasDoEvento(db, evento.id);

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="disp text-[46px]">Cronograma</h1>
          <p className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
            Horários estimados · atualiza sozinho
          </p>
        </div>
        <Link
          href={`/evento/${evento.slug}/telao`}
          className="shrink-0 border border-white/16 px-4 py-2.5 font-cond text-sm font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/30"
        >
          Modo telão
        </Link>
      </div>
      <CronogramaGrade filas={filas} />
    </div>
  );
}
