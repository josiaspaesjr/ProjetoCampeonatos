"use client";

import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import { useReordenavelAreas } from "@/lib/dnd/use-reordenavel-areas";
import {
  estadoAtleta,
  NomeAtleta,
  ResultadoBox,
} from "@/components/cronograma/programacao-areas";
import type { AreaCron, LutaCron } from "@/lib/cronograma/cronograma-areas";

/** linha do editor: a luta + o contexto da sua divisão */
interface LinhaEditor {
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
  faixa: string | null;
}

/** categoria de uma coluna, para o menu "levar para outro tatame" */
interface CategoriaDaColuna {
  /** id da categoria (quando conhecido) */
  id: string | null;
  titulo: string;
  faixa: string | null;
  nLutas: number;
  chaveGerada: boolean;
}

/**
 * Editor de ordem das lutas por área (drag-and-drop). Cada tatame vira uma
 * lista plana arrastável das suas lutas reais — dá para intercalar divisões,
 * **arrastar uma luta para outro tatame** e levar uma **categoria inteira**
 * para outra área pelo menu do rodapé. Nada disso mexe na chave (rodada,
 * posição e próxima luta ficam intactas): muda só onde e quando a luta corre.
 */
export function EditorOrdemAreas({
  cronograma,
  onReordenar,
  onMoverLuta,
  onMoverCategoria,
}: {
  cronograma: AreaCron[];
  onReordenar: (areaId: string, lutaIds: string[]) => void | Promise<void>;
  /** luta arrastada para outro tatame (com a ordem final do destino) */
  onMoverLuta: (
    lutaId: string,
    areaDestinoId: string,
    lutaIdsDestino: string[],
  ) => void | Promise<void>;
  /** categoria inteira levada para outro tatame */
  onMoverCategoria: (
    categoriaId: string,
    areaDestinoId: string,
  ) => void | Promise<void>;
}) {
  const ta = useDic().admin.areas;

  // linhas de todas as áreas, indexadas por id de luta
  const { linhaPorId, colunasIniciais } = useMemo(() => {
    const linhaPorId = new Map<string, LinhaEditor>();
    const colunasIniciais: Record<string, string[]> = {};
    for (const area of cronograma) {
      const ids: string[] = [];
      for (const cat of area.categorias) {
        if (!cat.chaveGerada) continue;
        for (const luta of cat.lutas) {
          linhaPorId.set(luta.id, {
            luta,
            catTitulo: cat.titulo,
            catSubtitulo: cat.subtitulo,
            faixa: cat.faixa,
          });
          ids.push(luta.id);
        }
      }
      colunasIniciais[area.id] = ids;
    }
    return { linhaPorId, colunasIniciais };
  }, [cronograma]);

  const { ordens, arrastandoId, alvo, registrarColuna, iniciarArraste } =
    useReordenavelAreas(colunasIniciais, (s) => {
      if (s.destinoId === s.origemId) onReordenar(s.origemId, s.ordemDestino);
      else onMoverLuta(s.itemId, s.destinoId, s.ordemDestino);
    });

  return (
    <>
      <p className="font-cond text-[12px] uppercase leading-snug tracking-[0.03em] text-muted-3">
        {ta.moverEntreAreasDica}
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cronograma.map((area) => (
          <ColunaEditavel
            key={area.id}
            area={area}
            areas={cronograma}
            ordem={ordens[area.id] ?? []}
            linhaPorId={linhaPorId}
            arrastandoId={arrastandoId}
            alvoIndex={alvo?.colunaId === area.id ? alvo.index : null}
            destacada={Boolean(
              arrastandoId && alvo?.colunaId === area.id,
            )}
            registrarColuna={registrarColuna}
            iniciarArraste={iniciarArraste}
            onMoverCategoria={onMoverCategoria}
          />
        ))}
      </div>
    </>
  );
}

function ColunaEditavel({
  area,
  areas,
  ordem,
  linhaPorId,
  arrastandoId,
  alvoIndex,
  destacada,
  registrarColuna,
  iniciarArraste,
  onMoverCategoria,
}: {
  area: AreaCron;
  areas: AreaCron[];
  ordem: string[];
  linhaPorId: Map<string, LinhaEditor>;
  arrastandoId: string | null;
  alvoIndex: number | null;
  destacada: boolean;
  registrarColuna: (colunaId: string) => (el: HTMLElement | null) => void;
  iniciarArraste: (
    id: string,
    origemId: string,
  ) => (e: React.PointerEvent) => void;
  onMoverCategoria: (
    categoriaId: string,
    areaDestinoId: string,
  ) => void | Promise<void>;
}) {
  const dp = useDic().placar;
  const ta = useDic().admin.areas;

  // categorias da coluna (uma entrada por divisão, mesmo com blocos repetidos)
  const categorias = useMemo<CategoriaDaColuna[]>(() => {
    const porTitulo = new Map<string, CategoriaDaColuna>();
    for (const c of area.categorias) {
      const atual = porTitulo.get(c.titulo);
      if (atual) {
        atual.nLutas += c.lutas.length;
        continue;
      }
      porTitulo.set(c.titulo, {
        id: c.categoriaId,
        titulo: c.titulo,
        faixa: c.faixa,
        nLutas: c.chaveGerada ? c.lutas.length : c.nLutas,
        chaveGerada: c.chaveGerada,
      });
    }
    return [...porTitulo.values()];
  }, [area.categorias]);

  // posição de cada luta na ordem atual (para o aviso de dependência)
  const posDe = useMemo(() => {
    const m = new Map<string, number>();
    ordem.forEach((id, i) => m.set(id, i));
    return m;
  }, [ordem]);

  const outrasAreas = areas.filter((a) => a.id !== area.id);

  return (
    <div
      ref={registrarColuna(area.id)}
      className={cn(
        "relative flex w-[360px] shrink-0 flex-col border bg-surface transition-colors",
        destacada ? "border-brand" : "border-white/10",
      )}
    >
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* HEADER */}
      <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="disp tnum text-[24px] leading-none">{area.nome}</span>
          <div>
            <span className="disp tnum text-[24px] leading-none text-brand">
              {ordem.length}
            </span>
            <span className="ml-1 font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
              {dp.lutas}
            </span>
          </div>
        </div>
      </div>

      {/* LISTA ARRASTÁVEL */}
      {ordem.length === 0 ? (
        <div
          className={cn(
            "px-4 py-8 text-center font-cond text-[13px] uppercase tracking-[0.04em]",
            destacada ? "text-brand-soft" : "text-muted-3",
          )}
        >
          {arrastandoId ? ta.moverSoltarAqui : ta.reordenarVazio}
        </div>
      ) : (
        <ul className="flex flex-col">
          {ordem.map((id, i) => {
            const linha = linhaPorId.get(id);
            if (!linha) return null;
            const { luta } = linha;
            // viola dependência se um alimentador desta luta vem DEPOIS dela
            const viola = luta.dependeDe.some((d) => (posDe.get(d) ?? -1) > i);
            return (
              <Fragment key={id}>
                {arrastandoId && alvoIndex === i && <Indicador />}
                <li
                  data-ordenavel-id={id}
                  className={cn(
                    "flex items-stretch gap-2 border-b border-white/6 pr-3 transition-opacity last:border-b-0",
                    arrastandoId === id && "opacity-40",
                  )}
                >
                  {/* ALÇA */}
                  <button
                    type="button"
                    aria-label={ta.reordenarAlca}
                    onPointerDown={iniciarArraste(id, area.id)}
                    style={{ touchAction: "none" }}
                    className="flex w-8 shrink-0 cursor-grab items-center justify-center self-stretch text-muted-3 transition-colors hover:bg-white/[0.04] hover:text-brand-soft active:cursor-grabbing"
                  >
                    <span className="text-[15px] leading-none">⠿</span>
                  </button>

                  {/* HORA + Ln */}
                  <div className="w-11 shrink-0 py-2">
                    <div className="disp tnum text-[15px] leading-none">
                      {luta.hora}
                    </div>
                    <div className="mt-1 font-cond text-[10px] uppercase tracking-[0.06em] text-muted-3">
                      {luta.label}
                    </div>
                  </div>

                  {/* DIVISÃO + ATLETAS */}
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 -skew-x-9 border border-white/25"
                        style={{ background: corDaFaixa(linha.faixa) }}
                      />
                      <span className="truncate font-cond text-[10px] uppercase tracking-[0.04em] text-muted-2">
                        {linha.catTitulo}
                      </span>
                      {viola && (
                        <span
                          title={ta.reordenarAviso}
                          className="ml-auto shrink-0 text-[12px] leading-none text-brand-soft"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                    <NomeAtleta nome={luta.a1} estado={estadoAtleta(luta, 1)} />
                    <NomeAtleta nome={luta.a2} estado={estadoAtleta(luta, 2)} />
                  </div>

                  {/* W/L */}
                  <div className="flex shrink-0 flex-col justify-center gap-1 py-2">
                    <ResultadoBox estado={estadoAtleta(luta, 1)} />
                    <ResultadoBox estado={estadoAtleta(luta, 2)} />
                  </div>
                </li>
              </Fragment>
            );
          })}
          {arrastandoId && alvoIndex === ordem.length && <Indicador />}
        </ul>
      )}

      {/* CATEGORIAS DA COLUNA: levar a divisão inteira para outro tatame */}
      {categorias.length > 0 && outrasAreas.length > 0 && (
        <div className="border-t border-white/10 px-4 py-2.5">
          <div className="mb-1.5 font-cond text-[10px] uppercase tracking-[0.08em] text-muted-3">
            {ta.moverCategoriaTitulo}
          </div>
          <ul className="flex flex-col gap-1">
            {categorias.map((c, i) => (
              <li key={c.id ?? i} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 -skew-x-9 border border-white/25"
                  style={{ background: corDaFaixa(c.faixa) }}
                />
                <span className="min-w-0 flex-1 truncate font-cond text-[11px] uppercase tracking-[0.02em] text-muted-2">
                  {c.titulo}
                  {!c.chaveGerada && (
                    <span className="ml-1 text-muted-3">
                      · {dp.chaveNaoGerada}
                    </span>
                  )}
                </span>
                {c.id && (
                  <MenuMoverCategoria
                    categoriaId={c.id}
                    areas={outrasAreas}
                    rotulo={ta.moverCategoriaBotao}
                    onMover={onMoverCategoria}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** menu enxuto: escolhe o tatame de destino da categoria */
function MenuMoverCategoria({
  categoriaId,
  areas,
  rotulo,
  onMover,
}: {
  categoriaId: string;
  areas: AreaCron[];
  rotulo: string;
  onMover: (categoriaId: string, areaDestinoId: string) => void | Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="font-cond text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-brand-soft"
      >
        {rotulo} →
      </button>
      {aberto && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul className="absolute right-0 z-50 mt-1 min-w-[132px] border border-white/14 bg-background py-1 shadow-xl">
            {areas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    onMover(categoriaId, a.id);
                  }}
                  className="block w-full px-3 py-1.5 text-left font-cond text-[11px] uppercase tracking-[0.04em] text-text-2 transition-colors hover:bg-white/[0.06] hover:text-brand-soft"
                >
                  {a.nome}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** risco vermelho mostrando onde a luta cai ao soltar */
function Indicador() {
  return <li className="h-0.5 shrink-0 bg-brand" />;
}
