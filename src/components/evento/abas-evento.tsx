"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDic } from "@/lib/i18n/client";
import type { Dicionario } from "@/lib/i18n/dicionarios";

type ChaveAba = keyof Dicionario["evento"]["abas"];

interface Aba {
  /** segmento uma camada abaixo do layout `(abas)`; null = página inicial */
  seg: string | null;
  chave: ChaveAba;
  href: string;
}

const ABAS: Aba[] = [
  { seg: null, chave: "informacoes", href: "" },
  { seg: "categorias", chave: "categorias", href: "/categorias" },
  { seg: "atletas", chave: "atletas", href: "/atletas" },
  { seg: "chaves", chave: "chaves", href: "/chaves" },
  { seg: "lutas", chave: "lutas", href: "/lutas" },
  { seg: "cronograma", chave: "cronograma", href: "/cronograma" },
  { seg: "resultados", chave: "resultados", href: "/resultados" },
];

export function AbasEvento({
  slug,
  contadores,
}: {
  slug: string;
  contadores: Partial<Record<string, number>>;
}) {
  const segmentoAtivo = useSelectedLayoutSegment();
  const dic = useDic();

  return (
    <nav className="sticky top-16 z-40 border-b border-white/8 bg-ink/90 backdrop-blur-xl">
      <div className="flex gap-1 overflow-x-auto px-6 md:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ABAS.map((aba) => {
          const ativo = aba.seg === segmentoAtivo;
          const contador = aba.seg ? contadores[aba.seg] : undefined;
          return (
            <Link
              key={aba.chave}
              href={`/evento/${slug}${aba.href}`}
              className={cn(
                "relative shrink-0 px-4 py-4 font-cond text-[15px] font-semibold uppercase tracking-[0.06em] transition-colors",
                ativo
                  ? "text-foreground"
                  : "text-muted-2 hover:text-text-2",
              )}
            >
              <span className="flex items-center gap-1.5">
                {dic.evento.abas[aba.chave]}
                {contador != null && contador > 0 && (
                  <span
                    className={cn(
                      "font-cond text-[11px] tabular-nums",
                      ativo ? "text-brand" : "text-muted-3",
                    )}
                  >
                    {contador}
                  </span>
                )}
              </span>
              {ativo && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] -skew-x-12 bg-brand" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
