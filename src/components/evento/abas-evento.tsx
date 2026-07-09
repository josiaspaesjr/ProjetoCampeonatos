"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

interface Aba {
  /** segmento uma camada abaixo do layout `(abas)`; null = página inicial */
  seg: string | null;
  rotulo: string;
  href: string;
}

const ABAS: Aba[] = [
  { seg: null, rotulo: "Informações", href: "" },
  { seg: "atletas", rotulo: "Atletas", href: "/atletas" },
  { seg: "chaves", rotulo: "Chaves", href: "/chaves" },
  { seg: "lutas", rotulo: "Lutas", href: "/lutas" },
  { seg: "cronograma", rotulo: "Cronograma", href: "/cronograma" },
  { seg: "resultados", rotulo: "Resultados", href: "/resultados" },
];

export function AbasEvento({
  slug,
  contadores,
}: {
  slug: string;
  contadores: Partial<Record<string, number>>;
}) {
  const segmentoAtivo = useSelectedLayoutSegment();

  return (
    <nav className="sticky top-16 z-40 border-b border-white/8 bg-ink/90 backdrop-blur-xl">
      <div className="flex gap-1 overflow-x-auto px-6 md:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ABAS.map((aba) => {
          const ativo = aba.seg === segmentoAtivo;
          const contador = aba.seg ? contadores[aba.seg] : undefined;
          return (
            <Link
              key={aba.rotulo}
              href={`/evento/${slug}${aba.href}`}
              className={cn(
                "relative shrink-0 px-4 py-4 font-cond text-[15px] font-semibold uppercase tracking-[0.06em] transition-colors",
                ativo
                  ? "text-foreground"
                  : "text-muted-2 hover:text-text-2",
              )}
            >
              <span className="flex items-center gap-1.5">
                {aba.rotulo}
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
