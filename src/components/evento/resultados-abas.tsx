"use client";

import Link from "next/link";
import { useState } from "react";
import type { LinhaQuadro } from "@/lib/chaves/quadro-medalhas";
import { MEDALHAS, type TipoMedalha } from "@/lib/chaves/medalhas";
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
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 font-cond text-[12px] uppercase tracking-[0.1em] text-muted-3 md:grid">
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
                "grid grid-cols-1 gap-x-4 gap-y-2 border-b border-white/6 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]",
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
              <Posicao tipo="ouro" posicao={1} atletas={p.ouro ? [p.ouro] : []} />
              <Posicao tipo="prata" posicao={2} atletas={p.prata ? [p.prata] : []} />
              <Posicao tipo="bronze" posicao={3} atletas={p.bronzes} />
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
                  style={{ color: MEDALHAS.ouro.anel }}
                >
                  {l.ouro}
                </span>
                <span
                  className="tnum text-right font-cond text-[15px]"
                  style={{ color: MEDALHAS.prata.anel }}
                >
                  {l.prata}
                </span>
                <span
                  className="tnum text-right font-cond text-[15px]"
                  style={{ color: MEDALHAS.bronze.anel }}
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
 * Uma posição do pódio na linha da divisão.
 *
 * O disco de medalha é o mesmo metal do pódio grande da chave — o número vive
 * nele, então a coluna não precisa repetir "1º". O campeão vem em caixa alta,
 * com o brilho do ouro por trás: numa tabela de dezenas de divisões, é o que
 * o olho procura primeiro.
 *
 * Bronze recebe uma lista: nas artes marciais são dois terceiros lugares, e
 * ambos merecem disco próprio em vez de um virar nota de rodapé do outro.
 */
function Posicao({
  tipo,
  posicao,
  atletas,
}: {
  tipo: TipoMedalha;
  posicao: number;
  atletas: Medalhista[];
}) {
  const m = MEDALHAS[tipo];

  if (atletas.length === 0) {
    return (
      <span
        aria-hidden
        className="mt-1 block h-[26px] w-[26px] rounded-full border border-dashed border-white/12"
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {atletas.map((a, i) => (
        <div key={`${a.nome}-${i}`} className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="disp flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[15px] leading-none"
            style={{
              background: m.disco,
              color: m.tinta,
              boxShadow: `0 0 0 1.5px ${m.anel}, 0 2px 10px ${m.glow}`,
            }}
          >
            {posicao}
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                "truncate",
                tipo === "ouro"
                  ? "font-cond text-[16px] font-bold uppercase tracking-[0.02em]"
                  : "text-sm font-medium",
              )}
              style={tipo === "ouro" ? { color: m.anel } : undefined}
            >
              {a.nome}
            </div>
            {a.academia && (
              <div className="truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                {a.academia}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
