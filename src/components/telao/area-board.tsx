import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { duracaoDaCategoria, type FilaDaArea } from "@/lib/cronograma/fila";
import { hora, rotuloCat } from "@/lib/cronograma/telao-format";
import { cn } from "@/lib/utils";

/**
 * "Tela" de UMA área no telão rotativo (`/telao`): só as lutas que vão
 * acontecer, estilo painel de aeroporto. SEM placar, SEM resultado — apenas
 * horário estimado + atletas. A 1ª luta pronta da fila é marcada "No tatame".
 * Server component (recebe o dicionário já resolvido para não repetir I/O).
 *
 * Altura contida na tela (o pai é `h-screen`): a lista corta o que passar da
 * dobra (`overflow-hidden`) e o rodapé "+N lutas" fica FORA dessa área cortada,
 * sempre visível, para não sumir em áreas com muitas lutas.
 */

type Txt = {
  proximas: string;
  noTatame: string;
  aguardando: string;
  semLutas: string;
  termina: string;
  luta: string;
  lutas: string;
};

/** teto de linhas mostradas por tela (cabe em ~1080p; o resto vira "+N lutas") */
const MAX_LINHAS = 8;

export function AreaBoard({ fila, t }: { fila: FilaDaArea; t: Txt }) {
  const lista = fila.fila;
  const visiveis = lista.slice(0, MAX_LINHAS);
  const restantes = lista.length - visiveis.length;
  // "no tatame" = 1ª luta pronta (ambos atletas definidos) no topo da fila
  const idxAtual = lista.findIndex((i) => i.pronta);

  const nome = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : t.aguardando;

  const terminaEm =
    lista.length > 0
      ? hora(
          new Date(
            lista.at(-1)!.horaEstimada.getTime() +
              duracaoDaCategoria(lista.at(-1)!.categoria) * 1000,
          ),
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* CABEÇALHO DA ÁREA */}
      <header className="flex shrink-0 items-end justify-between gap-4 border-b border-white/8 px-8 py-4 md:px-12 md:py-5">
        <h2 className="disp min-w-0 truncate text-[clamp(40px,7vw,104px)] leading-none">
          {fila.area.nome}
        </h2>
        {lista.length > 0 && (
          <div className="shrink-0 text-right font-cond text-sm uppercase tracking-[0.05em] text-muted-2 md:text-lg">
            <span className="tnum">{lista.length}</span>{" "}
            {lista.length === 1 ? t.luta : t.lutas}
            {terminaEm && (
              <div className="text-muted-3">
                {t.termina} ~<span className="tnum">{terminaEm}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* LISTA DE LUTAS (sem placar/resultado) */}
      {lista.length > 0 ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-4 md:px-12 md:pt-5">
            <div className="mb-2 shrink-0 font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-3 md:text-base">
              {t.proximas}
            </div>
            <ul className="flex flex-col divide-y divide-white/6">
              {visiveis.map((i, n) => {
                const atual = n === idxAtual;
                return (
                  <li
                    key={i.luta.id}
                    className={cn(
                      "flex items-center gap-4 py-3 md:gap-6 md:py-3.5",
                      atual && "bg-[rgba(238,46,36,0.08)]",
                    )}
                  >
                    {/* HORÁRIO ou "NO TATAME" */}
                    <div className="w-[128px] shrink-0 md:w-[188px]">
                      {atual ? (
                        <span className="inline-flex -skew-x-9 items-center gap-2 bg-brand px-3 py-1">
                          <span className="h-2 w-2 skew-x-9 animate-pulse-dot rounded-full bg-white" />
                          <span className="disp inline-block skew-x-9 text-[clamp(15px,1.5vw,22px)] leading-none text-white">
                            {t.noTatame}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex -skew-x-9 items-center bg-white/10 px-3 py-1">
                          <span className="disp tnum inline-block skew-x-9 text-[clamp(18px,2vw,30px)] leading-none text-foreground">
                            {hora(i.horaEstimada)}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* SWATCH DA FAIXA */}
                    <span
                      className="hidden h-6 w-6 shrink-0 -skew-x-9 border border-white/25 md:block"
                      style={{ background: corDaFaixa(i.categoria.faixa) }}
                    />

                    {/* ATLETAS + CATEGORIA */}
                    <div className="min-w-0 flex-1">
                      {i.pronta ? (
                        <>
                          <div className="truncate font-cond text-[clamp(19px,2.3vw,34px)] font-semibold uppercase leading-tight tracking-[0.01em]">
                            {nome(i.luta.atleta1InscricaoId)}
                            <span className="mx-2 text-muted-3 md:mx-3">×</span>
                            {nome(i.luta.atleta2InscricaoId)}
                          </div>
                          <div className="truncate font-cond text-[clamp(12px,1.2vw,17px)] uppercase tracking-[0.04em] text-muted-3">
                            {rotuloCat(i.categoria.nome)}
                          </div>
                        </>
                      ) : (
                        <div className="truncate font-cond text-[clamp(19px,2.3vw,34px)] uppercase leading-tight tracking-[0.01em] text-muted-2">
                          {rotuloCat(i.categoria.nome)}{" "}
                          <span className="text-muted-3">— {t.aguardando}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {restantes > 0 && (
            <div className="shrink-0 border-t border-white/8 px-6 py-3 font-cond text-sm uppercase tracking-[0.06em] text-muted-3 md:px-12 md:text-base">
              +<span className="tnum">{restantes}</span>{" "}
              {restantes === 1 ? t.luta : t.lutas}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="disp text-[clamp(32px,5vw,64px)] text-white/25">
            {t.semLutas}
          </p>
        </div>
      )}
    </div>
  );
}
