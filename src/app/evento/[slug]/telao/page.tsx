import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getEventoPublico } from "@/lib/evento-publico";
import { montarFilasDoEvento } from "@/lib/cronograma/fila";
import { CronogramaGrade } from "@/components/cronograma-grade";

/**
 * Modo telão — cronograma ao vivo em tela cheia para projetar no ginásio.
 * Fica FORA do route group `(abas)`, então não recebe o hero/abas do evento.
 */
export default async function Telao({
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
    <div className="min-h-screen bg-black px-8 py-6">
      <div>
        <h1 className="text-4xl font-bold text-white">{evento.nome}</h1>
        <p className="text-zinc-400">
          Cronograma ao vivo — horários estimados, atualiza sozinho
        </p>
      </div>
      <div className="mt-6">
        <CronogramaGrade filas={filas} tv />
      </div>
    </div>
  );
}
