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
      if (rodando && atualizadoEmMs != null) {
        return base - (Date.now() - atualizadoEmMs) / 1000;
      }
      return base;
    };
    setSeg(calc());
    if (!rodando) return;
    const id = setInterval(() => setSeg(calc()), 1000);
    return () => clearInterval(id);
  }, [restanteSeg, rodando, atualizadoEmMs, duracaoBaseSeg]);

  return (
    <span
      className={cn("disp tnum tabular-nums", seg < 0 && "text-brand", className)}
    >
      {fmtRelogio(seg)}
    </span>
  );
}
