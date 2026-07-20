import { tempoDeLutaSegundos, type FilaDaArea } from "@/lib/cronograma/fila";
import { hora, rotuloCat } from "@/lib/cronograma/telao-format";
import { getDicionario } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { CronometroTelao } from "./cronometro-telao";

/**
 * Placar de exibição de UMA área, em tela cheia (read-only, para projetar no
 * monitor ao lado do tatame). É o ESPELHO ampliado do placar que o organizador
 * opera no tablet: mesma luta corrente, mesmas cores (azul × vermelho), mesmo
 * layout — só que gigante e sem os botões. A atualização vem do `<AutoRefresh>`
 * montado pela página; o cronômetro "anda" localmente via `CronometroTelao`.
 */
export async function PlacarArea({
  evento,
  fila,
}: {
  evento: { nome: string };
  fila: FilaDaArea;
}) {
  const t = (await getDicionario()).telaoArea;

  // MESMA regra do tablet (placar/page.tsx): a luta corrente é a 1ª da fila
  // pronta (dois atletas definidos). Assim telão e tablet nunca divergem.
  const emAndamento = fila.fila.find((i) => i.pronta);

  const proximas = fila.fila.filter((i) => i !== emAndamento).slice(0, 5);
  const nome = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : t.aguardando;
  const academia = (id: string | null) =>
    (id && fila.atletas[id]?.academia) || "";

  return (
    <div className="flex h-screen flex-col gap-3 overflow-hidden p-3 md:gap-4 md:p-5">
      {/* BARRA SUPERIOR — categoria + cronômetro (estilo do tablet) */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl bg-zinc-900 px-6 py-4 text-white md:px-8 md:py-5">
        <div className="min-w-0">
          <div className="truncate font-cond text-xs font-semibold uppercase tracking-[0.16em] text-brand md:text-sm">
            {evento.nome} · {fila.area.nome}
          </div>
          <p className="truncate font-cond text-xl font-bold uppercase leading-tight md:text-3xl">
            {emAndamento
              ? `${t.noTatame} · ${rotuloCat(emAndamento.categoria.nome)}`
              : fila.fila.length === 0
                ? t.areaConcluida
                : t.aguardandoLuta}
          </p>
        </div>
        {emAndamento && (
          <CronometroTelao
            restanteSeg={emAndamento.luta.cronometroRestanteSeg}
            rodando={emAndamento.luta.cronometroRodando}
            atualizadoEmMs={
              emAndamento.luta.cronometroAtualizadoEm?.getTime() ?? null
            }
            duracaoBaseSeg={tempoDeLutaSegundos(emAndamento.categoria.faixa)}
            className="text-[clamp(44px,min(10vw,15vh),120px)] leading-none"
          />
        )}
      </div>

      {/* PLACAR — dois lados azul × vermelho (mesmo do tablet, ampliado) */}
      {emAndamento ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-5">
          <LadoTatame
            nome={nome(emAndamento.luta.atleta1InscricaoId)}
            academia={academia(emAndamento.luta.atleta1InscricaoId)}
            pontos={emAndamento.luta.pontos1}
            vantagens={emAndamento.luta.vantagens1}
            punicoes={emAndamento.luta.punicoes1}
            cor="bg-blue-700"
            t={t}
          />
          <LadoTatame
            nome={nome(emAndamento.luta.atleta2InscricaoId)}
            academia={academia(emAndamento.luta.atleta2InscricaoId)}
            pontos={emAndamento.luta.pontos2}
            vantagens={emAndamento.luta.vantagens2}
            punicoes={emAndamento.luta.punicoes2}
            cor="bg-red-700"
            t={t}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-surface">
          <p className="disp text-[clamp(32px,5vw,64px)] text-white/25">
            {fila.fila.length === 0 ? t.areaConcluida : t.aguardandoLuta}
          </p>
        </div>
      )}

      {/* PRÓXIMAS */}
      {proximas.length > 0 && (
        <div className="rounded-2xl bg-zinc-900 px-6 py-4 text-white md:px-8 md:py-5">
          <div className="mb-2 font-cond text-xs font-semibold uppercase tracking-[0.12em] text-white/45 md:text-sm">
            {t.proximas}
          </div>
          <ul className="flex flex-col gap-1.5">
            {proximas.map((i) => (
              <li key={i.luta.id} className="flex items-center gap-3">
                <span className="inline-flex shrink-0 -skew-x-9 items-center bg-brand px-2 py-0.5">
                  <span className="disp tnum inline-block skew-x-9 text-base leading-none text-white md:text-lg">
                    {hora(i.horaEstimada)}
                  </span>
                </span>
                <span className="truncate font-cond text-lg uppercase tracking-[0.01em] text-white/70 md:text-xl">
                  {i.pronta ? (
                    <>
                      {nome(i.luta.atleta1InscricaoId)}
                      <span className="mx-2 text-white/35">×</span>
                      {nome(i.luta.atleta2InscricaoId)}
                    </>
                  ) : (
                    `${rotuloCat(i.categoria.nome)} — ${t.aguardando}`
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Chip de vantagem/punição do telão, com cor por tipo (amarelo/vermelho) sobre
 * fundo escuro — mesmo esquema do placar do operador, legível nos dois lados.
 */
function ChipTelao({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: number;
  tom: "vantagem" | "punicao";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 rounded-xl bg-black/30 px-4 py-2 font-cond font-bold uppercase tabular-nums leading-none",
        tom === "vantagem" ? "text-yellow-300" : "text-red-400",
      )}
    >
      <span className="text-base tracking-[0.06em] opacity-90 md:text-2xl">{rotulo}</span>
      <span className="text-2xl md:text-4xl">{valor}</span>
    </div>
  );
}

/** Um lado do placar — caixa colorida cheia (azul ou vermelha), como no tablet. */
function LadoTatame({
  nome,
  academia,
  pontos,
  vantagens,
  punicoes,
  cor,
  t,
}: {
  nome: string;
  academia: string;
  pontos: number;
  vantagens: number;
  punicoes: number;
  cor: string;
  t: { vnt: string; pun: string };
}) {
  return (
    <div
      className={cn(
        // min-w-0 é o que deixa o `truncate` do nome funcionar dentro do flex —
        // sem ele, nomes longos empurram a largura e estouram a tela.
        "flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-2xl p-6 text-white md:p-8",
        cor,
      )}
    >
      <div className="truncate font-cond text-3xl font-bold uppercase leading-tight md:text-5xl lg:text-6xl">
        {nome}
      </div>
      {academia && (
        <div className="truncate font-cond text-lg uppercase tracking-[0.03em] text-white/60 md:text-2xl">
          {academia}
        </div>
      )}
      <div className="mt-4 flex items-end justify-between gap-6">
        <span className="disp tnum leading-[0.78] text-green-400 text-[clamp(64px,min(18vw,30vh),280px)]">
          {pontos}
        </span>
        <div className="mb-2 flex shrink-0 flex-col gap-2 text-right">
          <ChipTelao rotulo={t.vnt} valor={vantagens} tom="vantagem" />
          <ChipTelao rotulo={t.pun} valor={punicoes} tom="punicao" />
        </div>
      </div>
    </div>
  );
}
