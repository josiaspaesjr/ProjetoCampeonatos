"use client";

import { useEffect } from "react";
import type { lutas as lutasTable } from "@/db/schema";
import {
  BracketView,
  type AtletaInfo,
  type BracketLabels,
} from "@/components/bracket-view";

type LutaRow = typeof lutasTable.$inferSelect;

export interface ChaveImprimivel {
  categoriaNome: string;
  formato: string;
  lutas: LutaRow[];
  numJurados?: number;
}

/**
 * Página de impressão das chaves: renderiza o MESMO `BracketView` da tela (layout
 * "copa do mundo" com conectores SVG), uma chave por página, num tema CLARO
 * (sobrescreve as variáveis de cor do design, que só têm modo escuro) e escala
 * cada chave para caber na largura de uma folha A4 paisagem. Dispara o print
 * automaticamente quando os conectores já foram desenhados; o botão refaz.
 */
export function ChavesParaImprimir({
  itens,
  atletas,
  eventoNome,
  tituloPagina,
  labels,
  semChaves,
}: {
  itens: ChaveImprimivel[];
  atletas: Record<string, AtletaInfo>;
  eventoNome: string;
  tituloPagina: string;
  labels: BracketLabels;
  semChaves: string;
}) {
  useEffect(() => {
    if (!itens.length) return;
    const ALVO = 1040; // largura útil de uma A4 paisagem (px @96dpi, margens 10mm)
    const ajustar = () => {
      document
        .querySelectorAll<HTMLElement>(".bracket-scroller")
        .forEach((sc) => {
          sc.style.transform = "";
          if (sc.parentElement) sc.parentElement.style.height = "";
          const largura = sc.scrollWidth;
          const escala = Math.min(1, ALVO / Math.max(largura, 1));
          sc.style.transformOrigin = "top left";
          sc.style.transform = `scale(${escala})`;
          if (sc.parentElement)
            sc.parentElement.style.height = `${sc.scrollHeight * escala}px`;
        });
    };
    // ?preview mostra a página sem abrir o diálogo de impressão (conferência)
    const soPreview = new URLSearchParams(window.location.search).has("preview");
    const id = setTimeout(() => {
      ajustar();
      if (!soPreview) window.print();
    }, 600);
    return () => clearTimeout(id);
  }, [itens.length]);

  return (
    <div className="tema-claro-print">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="cabecalho nao-imprimir">
        <div>
          <div className="marca">
            League<span>Mat</span> · {tituloPagina}
          </div>
          <h1>{eventoNome}</h1>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-print">
          🖨 {tituloPagina}
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="vazio">{semChaves}</p>
      ) : (
        itens.map((it, i) => (
          <section className="chave-print" key={i}>
            <div className="cab-cat">
              <h2>{it.categoriaNome}</h2>
            </div>
            <div className="fit">
              <div className="bracket-scroller">
                <BracketView
                  lutas={it.lutas}
                  atletas={atletas}
                  formato={it.formato}
                  labels={labels}
                  numJurados={it.numJurados}
                />
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** tema claro + isolamento de impressão (a chave herda as vars sobrescritas) */
const CSS = `
.tema-claro-print {
  /* modo escuro é o único do app; o Tailwind (@theme inline) usa as vars CRUAS,
     então sobrescrevemos --card/--foreground/etc. (não as --color-*) p/ o papel */
  --background:#fff; --foreground:#18181b;
  --card:#fff; --card-foreground:#18181b;
  --popover:#fff; --popover-foreground:#18181b;
  --muted:#f4f4f5; --muted-foreground:#52525b;
  --accent:#f4f4f5; --accent-foreground:#18181b;
  --secondary:#f4f4f5; --secondary-foreground:#3f3f46;
  --border:#d4d4d8; --input:#d4d4d8;
  --primary:#ee2e24; --primary-foreground:#fff;
  --success:#166534; --success-foreground:#fff;

  position:fixed; inset:0; z-index:9999; overflow:auto;
  background:#fff; color:#18181b;
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
  padding:20px 24px 40px;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.tema-claro-print .cabecalho {
  display:flex; align-items:flex-start; justify-content:space-between; gap:16px;
  border-bottom:1px solid #d4d4d8; padding-bottom:14px; margin-bottom:16px;
}
.tema-claro-print .marca { font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#9ca3af; }
.tema-claro-print .marca span { color:#ee2e24; }
.tema-claro-print h1 { margin:6px 0 0; font-size:24px; font-weight:800; text-transform:uppercase; letter-spacing:-.01em; }
.tema-claro-print .btn-print { flex:none; border:0; background:#ee2e24; color:#fff; font-weight:800; text-transform:uppercase; letter-spacing:.04em; font-size:13px; padding:10px 18px; transform:skewX(-9deg); cursor:pointer; }
.tema-claro-print .btn-print { display:inline-block; }
.tema-claro-print .vazio { color:#6b7280; font-size:14px; }

.tema-claro-print .chave-print { break-inside:avoid; break-before:page; padding-top:6px; }
.tema-claro-print .chave-print:first-of-type { break-before:auto; }
.tema-claro-print .cab-cat { border-bottom:2px solid #18181b; padding-bottom:8px; margin:10px 0 12px; }
.tema-claro-print .cab-cat h2 { margin:0; font-size:17px; font-weight:800; text-transform:uppercase; }

/* a chave é escalada por JS p/ caber na folha; matamos o scroll interno p/ medir */
.tema-claro-print .fit { overflow:hidden; }
.tema-claro-print .bracket-scroller { display:inline-block; }
.tema-claro-print .overflow-x-auto { overflow:visible !important; }

/* conectores SVG: a chave usa branco fixo (invisível no papel) → cinza */
.tema-claro-print svg path { stroke:#94a3b8 !important; }

@media print {
  /* isola a impressão só nesta árvore, sem o chrome do console atrás */
  body { visibility:hidden; background:#fff; }
  .tema-claro-print, .tema-claro-print * { visibility:visible; }
  .tema-claro-print { position:static; z-index:auto; overflow:visible; padding:0; }
  .tema-claro-print .nao-imprimir { display:none !important; }
  @page { size:A4 landscape; margin:10mm; }
}
`;
