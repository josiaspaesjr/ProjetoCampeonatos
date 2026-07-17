"use client";

import { useState } from "react";
import { useDic } from "@/lib/i18n/client";

/** Campo com o caminho do convite + botão que copia a URL absoluta. */
export function ConviteLink({ path }: { path: string }) {
  const t = useDic().admin.equipe;
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={path}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 border border-white/10 bg-raised px-2.5 py-1.5 font-mono text-xs text-muted-2"
      />
      <button
        type="button"
        onClick={async () => {
          const url = window.location.origin + path;
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          } catch {
            /* clipboard indisponível — o campo fica selecionável para copiar */
          }
        }}
        className="shrink-0 cursor-pointer border border-white/15 px-3 py-1.5 font-cond text-xs font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:border-brand/50"
      >
        {copiado ? t.copiado : t.copiar}
      </button>
    </div>
  );
}
