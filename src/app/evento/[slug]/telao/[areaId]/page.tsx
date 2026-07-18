import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getEventoPublico } from "@/lib/evento-publico";
import { montarFilaDaArea } from "@/lib/cronograma/fila";
import { AutoRefresh } from "@/components/auto-refresh";
import { BotaoTelaCheia } from "@/components/telao/botao-tela-cheia";
import { PlacarArea } from "@/components/telao/placar-area";

/**
 * Placar ao vivo de UMA área, em tela cheia, para projetar no monitor ao lado do
 * tatame. Público (mesmo padrão do telão geral), read-only. Fora do route group
 * `(abas)` — sem hero/abas. `AutoRefresh` mantém placar e cronômetro atualizados.
 */
export const dynamic = "force-dynamic";

export default async function TelaoArea({
  params,
}: {
  params: Promise<{ slug: string; areaId: string }>;
}) {
  const { slug, areaId } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;

  const db = await getDb();
  const fila = await montarFilaDaArea(db, areaId);
  // valida o vínculo evento↔área (URL forjada / área de outro evento)
  if (!fila || fila.area.eventoId !== evento.id) notFound();

  return (
    <main id="placar-root" className="min-h-screen bg-background text-foreground">
      <AutoRefresh segundos={3} />
      <BotaoTelaCheia />
      <PlacarArea evento={{ nome: evento.nome }} fila={fila} />
    </main>
  );
}
