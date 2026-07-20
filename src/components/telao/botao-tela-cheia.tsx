"use client";

import { useEffect, useState } from "react";
import { useDic } from "@/lib/i18n/client";

/**
 * Alterna a tela cheia (Fullscreen API) do elemento `#${alvoId}` (achado por id,
 * para não cruzar a fronteira server/client com ref). Precisa de um gesto do
 * usuário — por isso é um botão, não automático.
 *
 * - `flutuante` (padrão): ícone no canto fixo — usado no telão (edge-to-edge).
 * - `inline`: botão com rótulo para uma barra — usado no placar do operador,
 *   onde o canto fixo colidiria com o cabeçalho do console.
 */
export function BotaoTelaCheia({
  alvoId = "placar-root",
  variante = "flutuante",
}: {
  alvoId?: string;
  variante?: "flutuante" | "inline";
} = {}) {
  const t = useDic().telaoArea;
  const [cheia, setCheia] = useState(false);

  useEffect(() => {
    const h = () => setCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.getElementById(alvoId)?.requestFullscreen();
  };

  const rotulo = cheia ? t.sairTelaCheia : t.telaCheia;
  const icone = cheia ? "✕" : "⤢";

  if (variante === "inline") {
    return (
      <button
        type="button"
        onClick={alternar}
        aria-label={rotulo}
        title={rotulo}
        className="inline-flex shrink-0 items-center gap-2 border border-white/15 bg-white/5 px-3.5 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-white/35 hover:text-foreground"
      >
        <span className="text-base leading-none">{icone}</span>
        {rotulo}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center border border-white/15 bg-black/40 text-xl text-muted-2 backdrop-blur transition-colors hover:border-white/35 hover:text-foreground"
    >
      {icone}
    </button>
  );
}
