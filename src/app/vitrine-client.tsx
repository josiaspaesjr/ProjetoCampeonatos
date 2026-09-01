"use client";

import Link from "next/link";
import { useState } from "react";
import { SkewTexto } from "@/components/marca";
import { useDic } from "@/lib/i18n/client";
import type { BracketVivo } from "@/lib/bracket-vivo";
import type { RankingGeral } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export interface StatVitrine {
  valor: string;
  destaque: boolean;
}

/**
 * O que vem depois da grade de eventos na home: números reais do circuito,
 * uma chave ao vivo (ou demo) e o ranking. Fecha com o convite para
 * /plataforma — a home vende os torneios, a plataforma se explica lá.
 */
export function VitrineClient({
  stats,
  bracket,
  ranking,
}: {
  stats: StatVitrine[];
  bracket: BracketVivo;
  ranking: RankingGeral;
}) {
  const dic = useDic();
  const t = dic.home;
  const [aba, setAba] = useState<keyof RankingGeral>("adulto");
  const linhas = ranking[aba].slice(0, 5);

  return (
    <>
      {/* NÚMEROS (dados reais) */}
      <section className="border-y border-white/8 px-6 py-[54px] md:px-12">
        <div className="mb-7">
          <Eyebrow>{t.statsEyebrow}</Eyebrow>
          <h2 className="disp text-[clamp(36px,5vw,56px)]">{t.statsTitulo}</h2>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-background px-[30px] py-[26px]">
              <div
                className={cn(
                  "disp tnum text-[clamp(52px,7vw,76px)]",
                  s.destaque ? "text-brand" : "text-foreground",
                )}
              >
                {s.valor}
              </div>
              <div className="mt-0.5 font-cond text-[15px] uppercase tracking-[0.08em] text-muted-2">
                {t.statLabels[i]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CHAVE AO VIVO */}
      <section
        id="aovivo"
        className="scroll-mt-24 border-b border-white/8 px-6 py-[84px] md:px-12"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <Eyebrow>{t.aoVivoEyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,72px)]">
              {t.aoVivoTitulo}
            </h2>
            <p className="mt-5 max-w-[520px] text-[18px] font-medium leading-normal text-text-2">
              {t.aoVivoDesc}
            </p>
            {bracket.demo && (
              <p className="mt-5 inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted-2">
                <SkewTexto>
                  <span className="h-1.5 w-1.5 bg-brand" />
                  {t.aoVivoDemo}
                </SkewTexto>
              </p>
            )}
          </div>

          <div className="border border-white/10 bg-surface">
            <div className="flex items-center justify-between border-b border-white/8 px-[18px] py-3 font-cond text-sm uppercase tracking-[0.08em] text-muted-2">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse-dot",
                    bracket.demo ? "bg-brand" : "bg-live",
                  )}
                />
                {bracket.titulo}
              </span>
              <span className="text-brand">
                {bracket.demo ? "DEMO" : "LIVE"}
              </span>
            </div>
            {[...bracket.esquerda, ...bracket.direita].map((m, i) => (
              <div
                key={`${m.nome}-${i}`}
                className={cn(
                  "flex items-center justify-between border-b border-white/6 px-[18px] py-[15px]",
                  m.venceu && "bg-brand/6",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-[26px] w-1.5",
                      m.venceu ? "bg-brand" : "bg-white/15",
                    )}
                  />
                  <span
                    className={cn(
                      "font-cond text-[22px] font-semibold uppercase",
                      m.venceu ? "text-foreground" : "text-muted-2",
                    )}
                  >
                    {m.nome}
                  </span>
                </div>
                <span
                  className={cn(
                    "disp tnum text-[34px]",
                    m.venceu ? "text-brand" : "text-muted-2",
                  )}
                >
                  {m.placar}
                </span>
              </div>
            ))}
            <div className="px-[18px] py-3">
              <Link
                href={bracket.href}
                className="font-cond text-sm font-bold uppercase tracking-[0.08em] text-brand-soft hover:text-brand"
              >
                {t.aoVivoCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RANKING (dados reais) */}
      <section
        id="ranking"
        className="scroll-mt-24 border-b border-white/8 px-6 py-[84px] md:px-12"
      >
        <div className="grid gap-11 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <Eyebrow>{t.rankEyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.rankTitulo}</h2>
            <p className="mt-5 max-w-[420px] text-[18px] font-medium leading-normal text-text-2">
              {t.rankDesc}
            </p>
            <div className="mt-7 flex gap-1.5">
              {(Object.keys(t.rankTabs) as (keyof RankingGeral)[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setAba(k)}
                  className={cn(
                    "cursor-pointer px-3.5 py-2 font-cond text-sm font-bold uppercase tracking-[0.06em] transition-colors",
                    aba === k
                      ? "bg-brand text-white"
                      : "border border-white/15 text-muted-2 hover:text-foreground",
                  )}
                >
                  {t.rankTabs[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-white/10">
            {linhas.length === 0 ? (
              <div className="px-[18px] py-10 font-cond text-base text-muted-3">
                {t.rankVazio}
              </div>
            ) : (
              linhas.map((r, i) => (
                <div
                  key={`${r.nome}-${i}`}
                  className={cn(
                    "grid grid-cols-[56px_1fr_auto] items-center border-b border-white/6 px-[18px] py-3.5",
                    i === 0 && "bg-brand/6",
                  )}
                >
                  <span
                    className={cn(
                      "disp text-[40px]",
                      i === 0
                        ? "text-brand"
                        : i < 3
                          ? "text-foreground"
                          : "text-muted-2",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-cond text-[22px] font-semibold uppercase">
                      {r.nome}
                    </div>
                    <div className="text-[13px] font-medium text-muted-2">
                      {r.equipe}
                    </div>
                  </div>
                  <span className="disp tnum text-[34px] text-brand">
                    {r.pontos.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CONVITE PARA A PLATAFORMA */}
      <section className="relative overflow-hidden px-6 py-[94px] text-center md:px-12">
        <div className="disp pointer-events-none absolute inset-x-0 top-0 flex justify-center whitespace-nowrap text-[280px] leading-none text-brand/[0.045]">
          ARENA
        </div>
        <div className="relative">
          <div className="mb-4 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
            {t.ctaEyebrow}
          </div>
          <h2 className="disp text-[clamp(48px,8vw,110px)]">
            {t.ctaTitulo}{" "}
            <span className="text-brand">{t.ctaAccent}</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[18px] font-medium leading-normal text-text-2">
            {t.ctaDesc}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/plataforma"
              className="-skew-x-9 bg-brand px-9 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white"
            >
              <SkewTexto>{t.ctaBtn1}</SkewTexto>
            </Link>
            <Link
              href="/organizador"
              className="-skew-x-9 border border-white/28 px-9 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
            >
              <SkewTexto>{t.ctaBtn2}</SkewTexto>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
      {children}
    </div>
  );
}
