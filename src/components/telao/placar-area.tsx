import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import {
  duracaoDaCategoria,
  tempoDeLutaSegundos,
  type FilaDaArea,
} from "@/lib/cronograma/fila";
import { hora, rotuloCat, forca } from "@/lib/cronograma/telao-format";
import { getDicionario } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { CronometroTelao } from "./cronometro-telao";

/**
 * Placar de exibição de UMA área, em tela cheia (read-only, para projetar no
 * monitor ao lado do tatame). Espelha a luta corrente com placar grande e
 * cronômetro ao vivo; a atualização vem do `<AutoRefresh>` montado pela página.
 */
export async function PlacarArea({
  evento,
  fila,
}: {
  evento: { nome: string };
  fila: FilaDaArea;
}) {
  const t = (await getDicionario()).telaoArea;

  // luta corrente: 1ª pronta com algum ponto/vantagem, senão a 1ª pronta
  const emAndamento =
    fila.fila.find(
      (i) =>
        i.pronta &&
        (i.luta.pontos1 > 0 ||
          i.luta.pontos2 > 0 ||
          i.luta.vantagens1 > 0 ||
          i.luta.vantagens2 > 0),
    ) ?? fila.fila.find((i) => i.pronta);

  const proximas = fila.fila.filter((i) => i !== emAndamento).slice(0, 6);
  const nome = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : t.aguardando;
  const academia = (id: string | null) =>
    (id && fila.atletas[id]?.academia) || "";

  const terminaEm =
    fila.fila.length > 0
      ? hora(
          new Date(
            fila.fila.at(-1)!.horaEstimada.getTime() +
              duracaoDaCategoria(fila.fila.at(-1)!.categoria) * 1000,
          ),
        )
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* CABEÇALHO */}
      <header className="flex items-end justify-between gap-4 border-b border-white/8 px-8 py-5 md:px-12">
        <div className="min-w-0">
          <div className="truncate font-cond text-sm font-semibold uppercase tracking-[0.14em] text-brand md:text-base">
            {evento.nome}
          </div>
          <h1 className="disp truncate text-[40px] leading-none md:text-[64px]">
            {fila.area.nome}
          </h1>
        </div>
        {fila.fila.length > 0 && (
          <div className="shrink-0 text-right font-cond text-sm uppercase tracking-[0.05em] text-muted-2 md:text-base">
            <span className="tnum">{fila.fila.length}</span>{" "}
            {fila.fila.length === 1 ? t.luta : t.lutas}
            {terminaEm && (
              <div className="text-muted-3">
                {t.termina} ~<span className="tnum">{terminaEm}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* NO TATAME */}
      {emAndamento ? (
        <section className="flex flex-1 flex-col justify-center px-6 py-6 md:px-12">
          {/* categoria + cronômetro */}
          <div className="mb-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <span
                className="h-5 w-5 shrink-0 -skew-x-9 border border-white/25"
                style={{ background: corDaFaixa(emAndamento.categoria.faixa) }}
              />
              <span className="font-cond text-lg font-bold uppercase tracking-[0.05em] text-brand-soft md:text-2xl">
                {t.noTatame} · {rotuloCat(emAndamento.categoria.nome)}
              </span>
            </div>
            <CronometroTelao
              restanteSeg={emAndamento.luta.cronometroRestanteSeg}
              rodando={emAndamento.luta.cronometroRodando}
              atualizadoEmMs={
                emAndamento.luta.cronometroAtualizadoEm?.getTime() ?? null
              }
              duracaoBaseSeg={tempoDeLutaSegundos(emAndamento.categoria.faixa)}
              className="text-[clamp(48px,9vw,120px)] leading-none"
            />
          </div>

          {/* dois lados */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LadoTatame
              nome={nome(emAndamento.luta.atleta1InscricaoId)}
              academia={academia(emAndamento.luta.atleta1InscricaoId)}
              pontos={emAndamento.luta.pontos1}
              vantagens={emAndamento.luta.vantagens1}
              punicoes={emAndamento.luta.punicoes1}
              cor="#3E7BD6"
              lider={
                forca(emAndamento.luta.pontos1, emAndamento.luta.vantagens1) >
                forca(emAndamento.luta.pontos2, emAndamento.luta.vantagens2)
              }
              t={t}
            />
            <LadoTatame
              nome={nome(emAndamento.luta.atleta2InscricaoId)}
              academia={academia(emAndamento.luta.atleta2InscricaoId)}
              pontos={emAndamento.luta.pontos2}
              vantagens={emAndamento.luta.vantagens2}
              punicoes={emAndamento.luta.punicoes2}
              cor="#EE2E24"
              lider={
                forca(emAndamento.luta.pontos2, emAndamento.luta.vantagens2) >
                forca(emAndamento.luta.pontos1, emAndamento.luta.vantagens1)
              }
              t={t}
            />
          </div>
        </section>
      ) : (
        <section className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="disp text-[clamp(32px,5vw,64px)] text-white/30">
            {fila.fila.length === 0 ? t.areaConcluida : t.aguardandoLuta}
          </p>
        </section>
      )}

      {/* PRÓXIMAS */}
      {proximas.length > 0 && (
        <footer className="border-t border-white/8 px-6 py-4 md:px-12">
          <div className="mb-2 font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-3">
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
                <span className="truncate font-cond text-lg uppercase tracking-[0.01em] text-muted-2 md:text-xl">
                  {i.pronta ? (
                    <>
                      {nome(i.luta.atleta1InscricaoId)}
                      <span className="mx-2 text-muted-3">×</span>
                      {nome(i.luta.atleta2InscricaoId)}
                    </>
                  ) : (
                    `${rotuloCat(i.categoria.nome)} — ${t.aguardando}`
                  )}
                </span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  );
}

function LadoTatame({
  nome,
  academia,
  pontos,
  vantagens,
  punicoes,
  cor,
  lider,
  t,
}: {
  nome: string;
  academia: string;
  pontos: number;
  vantagens: number;
  punicoes: number;
  cor: string;
  lider: boolean;
  t: { vnt: string; pun: string };
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border bg-surface px-6 py-5 md:px-8",
        lider ? "border-white/25" : "border-white/10",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-[6px]"
        style={{ background: cor }}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate font-cond text-2xl font-semibold uppercase leading-tight md:text-4xl">
            {nome}
          </div>
          {academia && (
            <div className="truncate font-cond text-sm uppercase tracking-[0.04em] text-muted-3 md:text-base">
              {academia}
            </div>
          )}
          <div className="mt-2 flex gap-4 font-cond text-sm uppercase tracking-[0.04em] text-muted-2 md:text-base">
            <span>
              {t.vnt} <span className="tnum font-bold text-foreground">{vantagens}</span>
            </span>
            <span>
              {t.pun} <span className="tnum font-bold text-foreground">{punicoes}</span>
            </span>
          </div>
        </div>
        <div
          className="disp tnum shrink-0 text-[clamp(72px,14vw,200px)] leading-none"
          style={{ color: lider ? "#EE2E24" : undefined }}
        >
          {pontos}
        </div>
      </div>
    </div>
  );
}
