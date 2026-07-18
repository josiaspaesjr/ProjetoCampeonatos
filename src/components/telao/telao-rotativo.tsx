"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Rotaciona as áreas do telão como um painel de aeroporto: cada área ocupa a
 * tela por `INTERVALO_MS` e então gira para a próxima, em loop. O conteúdo de
 * cada área é um Server Component já renderizado (passado como `board`), então
 * o `<AutoRefresh>` da página pode re-buscar a fila sem resetar a rotação —
 * o `idx` vive aqui, no cliente, e sobrevive ao `router.refresh()`.
 */

/** tempo que cada área fica na tela antes de girar */
const INTERVALO_MS = 10_000;

export function TelaoRotativo({
  areas,
}: {
  areas: { id: string; nome: string; board: ReactNode }[];
}) {
  const total = areas.length;
  const [idx, setIdx] = useState(0);
  // clampa caso o nº de áreas mude entre refreshes
  const atual = total > 0 ? idx % total : 0;

  useEffect(() => {
    if (total <= 1) return; // uma só área: nada para girar
    const id = setInterval(() => setIdx((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(id);
  }, [total]);

  if (total === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ÁREA ATUAL — corte seco a cada troca (`key` garante subtree novo). Sem
          fade de opacidade de propósito: animações CSS pausam em abas em segundo
          plano e deixariam a tela invisível num projetor sem operador. */}
      <div key={atual} className="flex min-h-0 flex-1 flex-col">
        {areas[atual].board}
      </div>

      {/* INDICADOR DE ROTAÇÃO (só faz sentido com 2+ áreas) */}
      {total > 1 && (
        <div className="shrink-0 border-t border-white/8">
          <div className="flex items-center justify-between gap-4 px-8 py-3 md:px-12">
            <div className="flex items-center gap-1.5">
              {areas.map((a, n) => (
                <span
                  key={a.id}
                  className={
                    n === atual
                      ? "h-2 w-8 -skew-x-12 bg-brand transition-all duration-300"
                      : "h-2 w-2 -skew-x-12 bg-white/20 transition-all duration-300"
                  }
                />
              ))}
            </div>
            <div className="min-w-0 truncate font-cond text-sm uppercase tracking-[0.08em] text-muted-2 md:text-base">
              {areas[atual].nome}{" "}
              <span className="tnum text-muted-3">
                {atual + 1}/{total}
              </span>
            </div>
          </div>
          {/* barra de progresso do tempo de exibição — reinicia a cada troca */}
          <div className="h-[4px] w-full overflow-hidden bg-white/8">
            <div
              key={atual}
              className="h-full origin-left bg-brand"
              style={{ animation: `telao-progress ${INTERVALO_MS}ms linear` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
