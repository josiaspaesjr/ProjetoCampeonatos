"use client";

import { useEffect, useRef, useState } from "react";

/** Botão "Copiar código" do Pix copia-e-cola; vira "Copiado ✓" por 2s. */
export function CopiarPix({ payload }: { payload: string }) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(payload);
        } catch {
          // clipboard indisponível (http antigo) — seleção manual ainda funciona
        }
        setCopiado(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopiado(false), 2000);
      }}
      className="w-full cursor-pointer border border-gold/50 px-2 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-gold-light transition-colors hover:border-gold"
    >
      {copiado ? "Copiado ✓" : "Copiar código"}
    </button>
  );
}
