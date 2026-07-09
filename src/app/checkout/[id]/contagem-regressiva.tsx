"use client";

import { useEffect, useState } from "react";

function formatar(segundos: number): string {
  const h = String(Math.floor(segundos / 3600)).padStart(2, "0");
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, "0");
  const s = String(segundos % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Contagem regressiva ao vivo até a expiração da cobrança Pix. */
export function ContagemRegressiva({ ate }: { ate: string }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const alvo = new Date(ate).getTime();
    const calcular = () =>
      setRestante(Math.max(0, Math.floor((alvo - Date.now()) / 1000)));
    calcular();
    const id = setInterval(calcular, 1000);
    return () => clearInterval(id);
  }, [ate]);

  // só renderiza no cliente para não divergir do HTML do servidor
  return (
    <span className="text-gold-light">
      {restante === null ? "--:--:--" : formatar(restante)}
    </span>
  );
}
