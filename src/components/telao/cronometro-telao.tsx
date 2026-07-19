"use client";

import { useEffect, useState } from "react";
import { fmtRelogio } from "@/lib/cronograma/telao-format";
import { cn } from "@/lib/utils";

/**
 * Relógio do placar por área. Espelha o estado persistido pelo tablet
 * (`cronometro*` na luta) e "anda" localmente entre os AutoRefreshes.
 *
 * Quando rodando, o tempo exibido = base − (agora − atualizadoEm), assumindo os
 * relógios do projetor e do servidor sincronizados (NTP); o AutoRefresh de ~3s
 * realinha com o servidor e captura iniciar/pausar do organizador. Só o tablet
 * escreve; aqui é read-only.
 */
export function CronometroTelao({
  restanteSeg,
  rodando,
  atualizadoEmMs,
  duracaoBaseSeg,
  className,
}: {
  restanteSeg: number | null;
  rodando: boolean;
  atualizadoEmMs: number | null;
  duracaoBaseSeg: number;
  className?: string;
}) {
  // inicial determinístico (sem Date.now → sem mismatch de hidratação); o effect
  // corrige no cliente pelo tempo já decorrido.
  const [seg, setSeg] = useState(restanteSeg ?? duracaoBaseSeg);

  useEffect(() => {
    const calc = () => {
      const base = restanteSeg ?? duracaoBaseSeg;
      const bruto =
        rodando && atualizadoEmMs != null
          ? base - (Date.now() - atualizadoEmMs) / 1000
          : base;
      // Nunca abaixo de 00:00: um relógio deixado "rodando" com âncora antiga
      // (ou dado semeado/abandonado) pararia em 00:00 em vez de virar um
      // negativo crescente sem sentido (-22:49…). O tablet controla a luta ao
      // vivo e reancoraria o relógio; aqui é read-only.
      return Math.max(0, bruto);
    };
    setSeg(calc());
    if (!rodando) return;
    const id = setInterval(() => {
      const v = calc();
      setSeg(v);
      if (v <= 0) clearInterval(id); // chegou a 00:00 — não há mais o que contar
    }, 1000);
    return () => clearInterval(id);
  }, [restanteSeg, rodando, atualizadoEmMs, duracaoBaseSeg]);

  return (
    <span
      className={cn("disp tnum tabular-nums", seg <= 0 && "text-brand", className)}
    >
      {fmtRelogio(seg)}
    </span>
  );
}
