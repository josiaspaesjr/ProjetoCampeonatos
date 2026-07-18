import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getEventoPublico } from "@/lib/evento-publico";
import { montarFilasDoEvento } from "@/lib/cronograma/fila";
import { getDicionario } from "@/lib/i18n/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { BotaoTelaCheia } from "@/components/telao/botao-tela-cheia";
import { AreaBoard } from "@/components/telao/area-board";
import { TelaoRotativo } from "@/components/telao/telao-rotativo";

/**
 * Modo telão — painel de "próximas lutas" por área, em tela cheia para projetar
 * no ginásio. Cada área ocupa a tela por alguns segundos e então gira para a
 * próxima, como um painel de aeroporto. SÓ o que vai acontecer: sem placar, sem
 * resultado. Fora do route group `(abas)` — sem hero/abas. O `AutoRefresh`
 * mantém a fila e os horários estimados atualizados; a rotação é client-side e
 * sobrevive ao refresh (o índice vive no `<TelaoRotativo>`).
 */
export const dynamic = "force-dynamic";

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
  const t = (await getDicionario()).telaoArea;

  const areas = filas.map((f) => ({
    id: f.area.id,
    nome: f.area.nome,
    board: <AreaBoard fila={f} t={t} />,
  }));

  return (
    <main
      id="placar-root"
      className="flex min-h-screen flex-col overflow-hidden bg-background text-foreground"
    >
      <AutoRefresh segundos={15} />
      <BotaoTelaCheia />

      {/* FAIXA DO EVENTO (fixa no topo, acima da rotação) */}
      <header className="shrink-0 border-b border-white/8 px-8 pb-3 pt-6 md:px-12">
        <div className="truncate font-cond text-sm font-semibold uppercase tracking-[0.14em] text-brand md:text-base">
          {evento.nome}
        </div>
        <p className="mt-0.5 font-cond text-xs uppercase tracking-[0.06em] text-muted-3 md:text-sm">
          {t.subtituloTelao}
        </p>
      </header>

      {areas.length > 0 ? (
        <TelaoRotativo areas={areas} />
      ) : (
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="max-w-2xl font-cond text-lg uppercase tracking-[0.04em] text-muted-3">
            {t.semCronograma}
          </p>
        </div>
      )}
    </main>
  );
}
