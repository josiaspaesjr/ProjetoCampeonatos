import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { duracaoDaCategoria, type FilaDaArea } from "@/lib/cronograma/fila";
import { forca, hora, rotuloCat } from "@/lib/cronograma/telao-format";

/**
 * Grade ao vivo do **modo telão** (`/telao`, tela cheia projetada no ginásio).
 * Mostra, por área, a luta **no tatame** (com placar) e as **próximas** com
 * horário estimado — usa a fila de lutas pendentes (`montarFilasDoEvento`), que
 * já pula as chaves concluídas, então a tela foca no "agora + a seguir".
 *
 * Adota a mesma linguagem visual da seção Áreas / aba Cronograma (barra de
 * acento vermelha, badge de horário inclinado, swatch de faixa, disp/cond).
 * O `AutoRefresh` mantém placar e horários atualizados sozinhos. Com `slug`, o
 * nome de cada área vira link para seu placar em tela cheia.
 */

function ColunaArea({ fila, slug }: { fila: FilaDaArea; slug?: string }) {
  const emAndamento =
    fila.fila.find(
      (i) =>
        i.pronta &&
        (i.luta.pontos1 > 0 ||
          i.luta.pontos2 > 0 ||
          i.luta.vantagens1 > 0 ||
          i.luta.vantagens2 > 0),
    ) ?? fila.fila.find((i) => i.pronta);

  const nome = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : "aguardando";

  const proximas = fila.fila.filter((i) => i !== emAndamento).slice(0, 7);

  return (
    <div className="relative flex flex-col border border-white/10 bg-surface">
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* HEADER */}
      <div className="flex items-baseline justify-between gap-3 border-b border-white/10 px-5 pb-3 pt-5">
        {slug ? (
          <Link
            href={`/evento/${slug}/telao/${fila.area.id}`}
            className="disp tnum min-w-0 truncate text-[26px] leading-none transition-colors hover:text-brand md:text-[34px]"
          >
            {fila.area.nome}
          </Link>
        ) : (
          <span className="disp tnum min-w-0 truncate text-[26px] leading-none md:text-[34px]">
            {fila.area.nome}
          </span>
        )}
        {fila.fila.length > 0 && (
          <span className="shrink-0 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
            <span className="tnum">{fila.fila.length}</span> luta
            {fila.fila.length === 1 ? "" : "s"} · termina ~
            <span className="tnum">
              {hora(
                new Date(
                  fila.fila.at(-1)!.horaEstimada.getTime() +
                    duracaoDaCategoria(fila.fila.at(-1)!.categoria) * 1000,
                ),
              )}
            </span>
          </span>
        )}
      </div>

      {/* NO TATAME (luta corrente + placar) */}
      {emAndamento && (
        <div className="relative border-b border-[rgba(238,46,36,0.25)] bg-[rgba(238,46,36,0.09)] px-5 py-4">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 shrink-0 -skew-x-9 border border-white/25"
              style={{ background: corDaFaixa(emAndamento.categoria.faixa) }}
            />
            <span className="truncate font-cond text-[13px] font-bold uppercase tracking-[0.05em] text-brand-soft">
              No tatame · {rotuloCat(emAndamento.categoria.nome)}
            </span>
          </div>
          <div className="space-y-2">
            <AtletaTatame
              nome={nome(emAndamento.luta.atleta1InscricaoId)}
              pontos={emAndamento.luta.pontos1}
              lider={
                forca(emAndamento.luta.pontos1, emAndamento.luta.vantagens1) >
                forca(emAndamento.luta.pontos2, emAndamento.luta.vantagens2)
              }
            />
            <AtletaTatame
              nome={nome(emAndamento.luta.atleta2InscricaoId)}
              pontos={emAndamento.luta.pontos2}
              lider={
                forca(emAndamento.luta.pontos2, emAndamento.luta.vantagens2) >
                forca(emAndamento.luta.pontos1, emAndamento.luta.vantagens1)
              }
            />
          </div>
        </div>
      )}

      {/* PRÓXIMAS */}
      <ul className="flex flex-col">
        {proximas.map((i) => (
          <li
            key={i.luta.id}
            className="flex items-center gap-3 border-b border-white/6 px-5 py-2.5 last:border-b-0"
          >
            <span className="inline-flex shrink-0 -skew-x-9 items-center bg-brand px-2 py-0.5">
              <span className="disp tnum inline-block skew-x-9 text-[15px] leading-none text-white">
                {hora(i.horaEstimada)}
              </span>
            </span>
            <span className="truncate font-cond text-[16px] uppercase tracking-[0.01em] text-muted-2">
              {i.pronta ? (
                <>
                  {nome(i.luta.atleta1InscricaoId)}
                  <span className="mx-1.5 text-muted-3">×</span>
                  {nome(i.luta.atleta2InscricaoId)}
                </>
              ) : (
                `${rotuloCat(i.categoria.nome)} — aguardando`
              )}
            </span>
          </li>
        ))}
        {fila.fila.length === 0 && (
          <li className="px-5 py-6 text-center font-cond text-[14px] uppercase tracking-[0.04em] text-muted-3">
            Área concluída ✓
          </li>
        )}
      </ul>
    </div>
  );
}

/** linha de atleta no bloco "No tatame": nome + pontos (líder em vermelho) */
function AtletaTatame({
  nome,
  pontos,
  lider,
}: {
  nome: string;
  pontos: number;
  lider: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`truncate font-cond text-[20px] uppercase tracking-[0.01em] ${lider ? "font-semibold text-foreground" : "text-muted-2"}`}
      >
        {nome}
      </span>
      <span
        className={`disp tnum shrink-0 text-[28px] leading-none md:text-[34px] ${lider ? "text-brand" : "text-foreground"}`}
      >
        {pontos}
      </span>
    </div>
  );
}

/** Grade de áreas do telão (colunas lado a lado numa tela ampla). */
export function CronogramaGrade({
  filas,
  slug,
}: {
  filas: FilaDaArea[];
  slug?: string;
}) {
  return (
    <>
      <AutoRefresh segundos={5} />
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${filas.length > 2 ? "xl:grid-cols-3" : ""}`}
      >
        {filas.map((f) => (
          <ColunaArea key={f.area.id} fila={f} slug={slug} />
        ))}
        {filas.length === 0 && (
          <p className="font-cond text-[15px] uppercase tracking-[0.04em] text-muted-3">
            O cronograma aparece aqui quando o organizador distribuir as chaves
            pelas áreas.
          </p>
        )}
      </div>
    </>
  );
}
