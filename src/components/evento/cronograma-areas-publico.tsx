"use client";

import { useEffect, useState } from "react";
import { useDic } from "@/lib/i18n/client";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  AbrirLutaCtx,
  ModalPlacar,
  ProgramacaoAreas,
  type LutaSelecionada,
} from "@/components/cronograma/programacao-areas";
import type { AreaCron } from "@/lib/cronograma/cronograma-areas";

/**
 * Cronograma público do evento: a mesma programação por área da seção **Áreas**
 * do organizador, numa **grade** (até 3 colunas lado a lado — Área 1 · Área 2 ·
 * Área 3) e sem os controles de edição. Atualiza sozinho e clicar numa luta
 * abre o placar.
 */
export function CronogramaAreasPublico({
  cronograma,
}: {
  cronograma: AreaCron[];
}) {
  const [lutaSel, setLutaSel] = useState<LutaSelecionada | null>(null);
  const dcr = useDic().cronogramaTab;

  // modal aberto: trava o scroll do body e fecha com Esc
  useEffect(() => {
    if (!lutaSel) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLutaSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [lutaSel]);

  if (cronograma.length === 0) {
    return (
      <p className="font-cond text-sm uppercase tracking-[0.04em] text-muted-3">
        {dcr.vazio}
      </p>
    );
  }

  return (
    <AbrirLutaCtx.Provider value={setLutaSel}>
      <AutoRefresh segundos={10} />
      <ProgramacaoAreas cronograma={cronograma} layout="grade" />
      <ModalPlacar sel={lutaSel} onFechar={() => setLutaSel(null)} />
    </AbrirLutaCtx.Provider>
  );
}
