"use client";

import Link from "next/link";
import { useState } from "react";
import type { LinhaQuadro } from "@/lib/chaves/quadro-medalhas";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** um medalhista já resolvido em nome + academia */
export interface Medalhista {
  nome: string;
  academia: string | null;
}

/** o pódio de uma divisão, pronto para a tela */
export interface PodioDivisao {
  categoriaId: string;
  nome: string;
  faixa: string | null;
  ouro: Medalhista | null;
  prata: Medalhista | null;
  /** artes marciais têm dois terceiros lugares */
  bronzes: Medalhista[];
}

type Aba = "podios" | "quadro";

const COR_OURO = "#F1C85A";
const COR_PRATA = "#CFD7DF";
const COR_BRONZE = "#D5894F";

/**
 * As duas leituras do resultado, em abas.
 *
 * "Pódios" abre primeiro: é a lista divisão a divisão, onde o atleta procura a
 * própria. "Quadro de medalhas" é a soma por academia — a leitura de quem quer
 * saber como a equipe foi no geral.
 */
export function ResultadosAbas({
  podios,
  quadro,
  slug,
}: {
  podios: PodioDivisao[];
  quadro: LinhaQuadro[];
  slug: string;
}) {
  const dr = useDic().resultadosTab;
  const [aba, setAba] = useState<Aba>("podios");

  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: "podios", rotulo: dr.abaPodios, n: podios.length },
    { id: "quadro", rotulo: dr.abaQuadro, n: quadro.length },
  ];

  return (
    <>
      <div role="tablist" className="mb-6 flex gap-1 border-b border-white/8">
        {abas.map((a) => {
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={ativo}
              onClick={() => setAba(a.id)}
              className={cn(
                "relative shrink-0 cursor-pointer px-4 py-3 font-cond text-[15px] font-semibold uppercase tracking-[0.06em] transition-colors",
                ativo ? "text-foreground" : "text-muted-2 hover:text-text-2",
              )}
            >
              <span className="flex items-center gap-1.5">
                {a.rotulo}
                {a.n > 0 && (
                  <span
                    className={cn(
                      "font-cond text-[11px] tabular-nums",
                      ativo ? "text-brand" : "text-muted-3",
                    )}
                  >
                    {a.n}
                  </span>
                )}
              </span>
              {ativo && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] -skew-x-12 bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      {aba === "podios" ? (
        <div className="border border-white/10">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3 md:grid">
            <span>{dr.colDivisao}</span>
            <span>{dr.ouro}</span>
            <span>{dr.prata}</span>
            <span>{dr.bronze}</span>
          </div>
          {podios.map((p, i) => (
            <Link
              key={p.categoriaId}
              href={`/evento/${slug}/chaves/${p.categoriaId}`}
              className={cn(
                "grid grid-cols-1 gap-x-4 gap-y-2 border-b border-white/6 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))]",
                i % 2 === 1 && "bg-white/[0.015]",
              )}
            >
              <div className="flex min-w-0 items-center gap-[13px]">
                <span
                  className="h-[9px] w-[9px] shrink-0 -skew-x-9 border border-white/20"
                  style={{ background: corDaFaixa(p.faixa) }}
                />
                <span className="truncate font-cond text-[17px] font-semibold uppercase tracking-[0.02em]">
                  {p.nome}
                </span>
              </div>
              <Posicao rotulo={dr.ouro} atleta={p.ouro} cor={COR_OURO} />
              <Posicao rotulo={dr.prata} atleta={p.prata} cor={COR_PRATA} />
              <Posicao
                rotulo={dr.bronze}
                atleta={p.bronzes[0] ?? null}
                extra={p.bronzes[1] ?? null}
                cor={COR_BRONZE}
              />
            </Link>
          ))}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-2">{dr.quadroDesc}</p>
          <div className="border border-white/10">
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3">
              <span>{dr.academia}</span>
              <span className="text-right">{dr.ouro}</span>
              <span className="text-right">{dr.prata}</span>
              <span className="text-right">{dr.bronze}</span>
              <span className="text-right">{dr.total}</span>
            </div>
            {quadro.map((l, i) => (
              <div
                key={l.academia}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-3 border-b border-white/6 px-5 py-3 last:border-b-0",
                  i % 2 === 1 && "bg-white/[0.015]",
                )}
              >
                <span className="truncate font-cond text-[16px] uppercase tracking-[0.02em]">
                  {l.academia}
                </span>
                <span
                  className="tnum text-right font-cond text-[15px]"
                  style={{ color: COR_OURO }}
                >
                  {l.ouro}
                </span>
                <span
                  className="tnum text-right font-cond text-[15px]"
                  style={{ color: COR_PRATA }}
                >
                  {l.prata}
                </span>
                <span
                  className="tnum text-right font-cond text-[15px]"
                  style={{ color: COR_BRONZE }}
                >
                  {l.bronze}
                </span>
                <span className="disp tnum text-right text-[18px]">
                  {l.total}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/**
 * Uma posição do pódio. O rótulo (1º/2º/3º) aparece só no mobile, onde não há
 * cabeçalho de coluna para dizer o que é cada campo.
 */
function Posicao({
  rotulo,
  atleta,
  extra,
  cor,
}: {
  rotulo: string;
  atleta: Medalhista | null;
  extra?: Medalhista | null;
  cor: string;
}) {
  if (!atleta) {
    return <span className="font-cond text-sm text-muted-3">—</span>;
  }
  return (
    <div className="min-w-0">
      <span
        className="mr-1.5 font-cond text-[11px] uppercase tracking-[0.08em] md:hidden"
        style={{ color: cor }}
      >
        {rotulo}
      </span>
      <span className="truncate text-sm font-medium">{atleta.nome}</span>
      {atleta.academia && (
        <div className="truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
          {atleta.academia}
        </div>
      )}
      {extra && (
        <div className="mt-1.5 border-t border-white/6 pt-1.5">
          <span className="truncate text-sm font-medium">{extra.nome}</span>
          {extra.academia && (
            <div className="truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
              {extra.academia}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
