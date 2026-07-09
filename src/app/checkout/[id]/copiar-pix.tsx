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
      className="w-full cursor-pointer border border-brand/50 px-2 py-2.5 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-brand-soft transition-colors hover:border-brand"
    >
      {copiado ? "Copiado ✓" : "Copiar código"}
    </button>
  );
}
