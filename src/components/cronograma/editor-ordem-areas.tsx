"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import { useReordenavel } from "@/lib/dnd/use-reordenavel";
import {
  estadoAtleta,
  NomeAtleta,
  ResultadoBox,
} from "@/components/cronograma/programacao-areas";
import type { AreaCron, LutaCron } from "@/lib/cronograma/cronograma-areas";

/**
 * Editor de ordem das lutas por área (drag-and-drop). Cada tatame vira uma
 * lista plana arrastável das suas lutas reais — dá para intercalar divisões.
 * A ordem é salva no soltar via `onReordenar(areaId, lutaIds)`; só afeta o
 * cronograma e a fila (a chave não muda). Categorias ainda sem chave aparecem
 * como rodapé informativo (não arrastáveis).
 */
export function EditorOrdemAreas({
  cronograma,
  onReordenar,
}: {
  cronograma: AreaCron[];
  onReordenar: (areaId: string, lutaIds: string[]) => void | Promise<void>;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cronograma.map((area) => (
        <ColunaEditavel
          key={area.id}
          area={area}
          aoReordenar={(ids) => onReordenar(area.id, ids)}
        />
      ))}
    </div>
  );
}

/** linha do editor: a luta + o contexto da sua divisão */
interface LinhaEditor {
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
  faixa: string | null;
}

function ColunaEditavel({
  area,
  aoReordenar,
}: {
  area: AreaCron;
  aoReordenar: (lutaIds: string[]) => void | Promise<void>;
}) {
  const dp = useDic().placar;
  const ta = useDic().admin.areas;

  // lutas reais da área achatadas na ordem exibida (= ordem salva)
  const { linhaPorId, idsIniciais } = useMemo(() => {
    const linhas: LinhaEditor[] = [];
    for (const cat of area.categorias) {
      if (!cat.chaveGerada) continue;
      for (const luta of cat.lutas)
        linhas.push({
          luta,
          catTitulo: cat.titulo,
          catSubtitulo: cat.subtitulo,
          faixa: cat.faixa,
        });
    }
    return {
      linhaPorId: new Map(linhas.map((l) => [l.luta.id, l])),
      idsIniciais: linhas.map((l) => l.luta.id),
    };
  }, [area.categorias]);

  const { ordem, arrastandoId, alvoIndex, containerRef, iniciarArraste } =
    useReordenavel<HTMLUListElement>(idsIniciais, aoReordenar);

  // categorias sem chave (não reordenáveis) → rodapé informativo
  const semChave = area.categorias.filter((c) => !c.chaveGerada);

  // posição de cada luta na ordem atual (para o aviso de dependência)
  const posDe = useMemo(() => {
    const m = new Map<string, number>();
    ordem.forEach((id, i) => m.set(id, i));
    return m;
  }, [ordem]);

  return (
    <div className="relative flex w-[360px] shrink-0 flex-col border border-white/10 bg-surface">
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
        <div className="px-4 py-8 text-center font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
          {ta.reordenarVazio}
        </div>
      ) : (
        <ul ref={containerRef} className="flex flex-col">
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
                    onPointerDown={iniciarArraste(id)}
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

      {/* CATEGORIAS SEM CHAVE (informativo) */}
      {semChave.length > 0 && (
        <div className="border-t border-white/10 px-4 py-2.5">
          <div className="mb-1.5 font-cond text-[10px] uppercase tracking-[0.08em] text-muted-3">
            {dp.chaveNaoGerada}
          </div>
          <ul className="flex flex-col gap-1">
            {semChave.map((c, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 font-cond text-[11px] uppercase tracking-[0.02em] text-muted-2"
              >
                <span
                  className="h-2 w-2 shrink-0 -skew-x-9 border border-white/25"
                  style={{ background: corDaFaixa(c.faixa) }}
                />
                <span className="truncate">{c.titulo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** linha vermelha que marca onde a luta arrastada vai cair */
function Indicador() {
  return <li className="mx-2 h-[3px] bg-brand" aria-hidden />;
}
