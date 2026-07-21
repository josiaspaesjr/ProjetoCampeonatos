"use client";

import { imprimirHtml } from "@/lib/print";
import {
  montarHtmlChaves,
  type AtletaImpressao,
  type ChaveImpressao,
} from "@/lib/chaves/print-chaves";
import { useDic } from "@/lib/i18n/client";

export type { AtletaImpressao, ChaveImpressao } from "@/lib/chaves/print-chaves";

/**
 * Botão "Imprimir chaves": monta o documento A4 (paisagem, tema claro) com TODAS
 * as chaves geradas — uma por página, bracket visual (ver `montarHtmlChaves`) — e
 * imprime via iframe oculto (`imprimirHtml`). Reaproveita os rótulos de
 * `dic.bracket`, então não duplica i18n.
 */
export function BotaoImprimirChaves({
  chaves,
  atletas,
  eventoNome,
}: {
  chaves: ChaveImpressao[];
  atletas: Record<string, AtletaImpressao>;
  eventoNome: string;
}) {
  const dic = useDic();
  const ch = dic.admin.chaves;

  function imprimir() {
    const html = montarHtmlChaves(chaves, atletas, {
      titulo: ch.chavesTitulo,
      eventoNome,
      geradoEmRotulo: dic.admin.areas.geradoEm,
      geradoEm: new Date().toLocaleString("pt-BR"),
      formatoNome: (f) =>
        (ch.formatos as Record<string, { nome: string }>)[f]?.nome ?? f,
      L: dic.bracket,
    });
    imprimirHtml(html);
  }

  return (
    <button
      type="button"
      onClick={imprimir}
      className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
    >
      <span className="inline-block skew-x-9">🖨 {ch.imprimirChaves}</span>
    </button>
  );
}
