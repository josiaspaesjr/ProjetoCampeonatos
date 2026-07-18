"use client";

import { useEffect, useState } from "react";
import { useDic } from "@/lib/i18n/client";

/**
 * Alterna a tela cheia do placar (Fullscreen API). Age sobre `#placar-root`
 * (achado por id, para não cruzar a fronteira server/client com ref). Precisa de
 * um gesto do usuário — por isso é um botão, não automático.
 */
export function BotaoTelaCheia() {
  const t = useDic().telaoArea;
  const [cheia, setCheia] = useState(false);

  useEffect(() => {
    const h = () => setCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.getElementById("placar-root")?.requestFullscreen();
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={cheia ? t.sairTelaCheia : t.telaCheia}
      title={cheia ? t.sairTelaCheia : t.telaCheia}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center border border-white/15 bg-black/40 text-xl text-muted-2 backdrop-blur transition-colors hover:border-white/35 hover:text-foreground"
    >
      {cheia ? "✕" : "⤢"}
    </button>
  );
}
