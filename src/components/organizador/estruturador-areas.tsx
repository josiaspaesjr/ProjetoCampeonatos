"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import {
  classesEmOrdem,
  contarGrupos,
  corDaOnda,
  maiorOndaDeCats,
} from "@/lib/categorias/distribuicao-areas";
import {
  AbrirLutaCtx,
  ModalPlacar,
  ProgramacaoAreas,
  type LutaSelecionada,
} from "@/components/cronograma/programacao-areas";
import type { AreaCron } from "@/lib/cronograma/cronograma-areas";

const AREAS_MIN = 1;
const AREAS_MAX = 40;

/** categoria enxuta usada só na legenda do funil e no resumo (4 stats) */
export interface CategoriaView {
  classeIdade: string;
  sexo: string;
  faixa: string | null;
}

export function EstruturadorAreas({
  categorias,
  numAreasInicial,
  base,
  cronograma,
  estruturar,
}: {
  categorias: CategoriaView[];
  numAreasInicial: number | null;
  /** caminho base do evento, ex.: `/organizador/eventos/:id` */
  base: string;
  /** cronograma real por área (persistido) — vazio quando não estruturado */
  cronograma: AreaCron[];
  estruturar: (formData: FormData) => void | Promise<void>;
}) {
  const [areasN, setAreasN] = useState(
    numAreasInicial ? String(numAreasInicial) : "",
  );
  const [areasFull, setAreasFull] = useState(false);
  const [lutaSel, setLutaSel] = useState<LutaSelecionada | null>(null);

  const nInt = Math.floor(Number(areasN));
  const nValido = Number.isFinite(nInt) && nInt >= AREAS_MIN && nInt <= AREAS_MAX;
  const totalCategorias = categorias.length;
  const temCategorias = totalCategorias > 0;

  const maiorOndaValor = useMemo(() => maiorOndaDeCats(categorias), [categorias]);
  const gruposTotal = useMemo(() => contarGrupos(categorias), [categorias]);
  const classesDoFunil = useMemo(() => classesEmOrdem(categorias), [categorias]);

  // a estrutura vem persistida do servidor: a prévia só muda ao "Estruturar"
  const estruturado = cronograma.length > 0;

  // tela cheia e modal de placar: travam o scroll do body e fecham com Esc
  // (Esc fecha primeiro o modal, depois a tela cheia)
  useEffect(() => {
    if (!areasFull && !lutaSel) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lutaSel) setLutaSel(null);
      else if (areasFull) setAreasFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [areasFull, lutaSel]);

  // ---- SEM CATEGORIAS: bloqueia com prompt para a seção Categorias ----
  if (!temCategorias) {
    return (
      <div className="relative border border-white/10 bg-surface px-[22px] py-12 text-center">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="disp text-[26px]">Nenhuma categoria carregada</div>
        <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-2">
          Gere a grade de categorias antes de estruturar as áreas — a
          distribuição parte dela.
        </p>
        <Link
          href={`${base}/categorias`}
          className="mt-5 inline-flex -skew-x-9 items-center bg-brand px-5 py-3 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
        >
          <span className="inline-block skew-x-9">Ir para Categorias →</span>
        </Link>
      </div>
    );
  }

  const areasAtuais = cronograma.length;
  const media = areasAtuais ? Math.round(totalCategorias / areasAtuais) : 0;

  return (
    <AbrirLutaCtx.Provider value={setLutaSel}>
      {/* CARD DE CONTROLE */}
      <div className="relative border border-white/10 bg-surface">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="grid items-center gap-x-8 gap-y-6 px-6 py-[26px] lg:grid-cols-[auto_1fr_auto]">
          {/* Nº de áreas */}
          <div>
            <label
              htmlFor="num-areas"
              className="mb-1.5 block font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3"
            >
              Número de áreas (tatames)
            </label>
            <input
              id="num-areas"
              type="number"
              min={AREAS_MIN}
              max={AREAS_MAX}
              value={areasN}
              onChange={(e) => setAreasN(e.target.value)}
              placeholder="0"
              className="disp tnum w-[136px] border border-white/14 bg-background px-4 py-1 text-[64px] leading-none text-foreground focus:border-brand focus:outline-none"
            />
          </div>

          {/* Categorias carregadas */}
          <div>
            <div className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
              Categorias carregadas
            </div>
            <div className="disp tnum mt-1.5 text-[38px] leading-none">
              {totalCategorias}
            </div>
            <div className="mt-1.5 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
              em {gruposTotal} grupo{gruposTotal === 1 ? "" : "s"}
            </div>
          </div>

          {/* Estruturar */}
          <form action={estruturar} className="lg:justify-self-end">
            <input type="hidden" name="numAreas" value={nValido ? nInt : ""} />
            <BotaoAcaoBruto
              disabled={!nValido}
              className="inline-flex -skew-x-9 items-center bg-brand px-6 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-block skew-x-9">⚙ Estruturar áreas</span>
            </BotaoAcaoBruto>
          </form>
        </div>

        <p className="border-t border-white/10 px-6 py-3.5 font-cond text-[13px] uppercase leading-relaxed tracking-[0.03em] text-muted-3">
          O sistema ordena a grade dos extremos ao meio (kids e masters mais
          velhos liberam cedo, o miolo — Adulto / Master 1 — corre por último) e
          espalha as categorias pelas áreas equilibrando a carga, montando o
          cronograma de lutas com horário previsto por tatame.
        </p>
      </div>

      {/* LEGENDA DO FUNIL */}
      <div className="border border-white/10 bg-surface p-[22px]">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <span className="disp text-[22px]">Ordem do dia</span>
          <span className="font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
            extremos → meio
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
          {classesDoFunil.map((c, i) => {
            const extremo = c.onda * 2 <= maiorOndaValor;
            return (
              <span key={c.nome} className="flex items-center gap-1">
                {i > 0 && <span className="mr-1 text-muted-3">›</span>}
                <span
                  className={cn(
                    "inline-flex -skew-x-9 items-center gap-2 border px-3 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.04em]",
                    extremo
                      ? "border-brand/40 text-brand-soft"
                      : "border-white/12 text-muted-2",
                  )}
                >
                  <span className="inline-flex skew-x-9 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ background: corDaOnda(c.onda, maiorOndaValor) }}
                    />
                    {c.nome}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {estruturado ? (
        <>
          {/* RESUMO — 4 STATS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat rotulo="Áreas" valor={String(areasAtuais)} sub="tatames" destaque />
            <Stat rotulo="Categorias" valor={String(totalCategorias)} sub="na grade" />
            <Stat rotulo="Média / área" valor={String(media)} sub="categorias" />
            <Stat
              rotulo="Grupos"
              valor={String(gruposTotal)}
              sub="classe · sexo · faixa"
            />
          </div>

          {/* BARRA DE AÇÃO */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAreasFull(true)}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
            >
              <span className="inline-block skew-x-9">⤢ Expandir para tela cheia</span>
            </button>
          </div>

          {/* COLUNAS DE ÁREA (lado a lado, scroll lateral) */}
          <ProgramacaoAreas
            cronograma={cronograma}
            layout="colunas"
            base={base}
            full={false}
          />
        </>
      ) : (
        // AINDA NÃO ESTRUTURADO
        <div className="border border-dashed border-white/12 bg-surface px-[22px] py-14 text-center">
          <div className="disp text-[26px] text-muted-2">
            Pronto para estruturar
          </div>
          <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-3">
            Informe o número de áreas e clique em{" "}
            <span className="text-brand-soft">Estruturar áreas</span> para
            distribuir as {totalCategorias} categorias e montar o cronograma.
          </p>
        </div>
      )}

      {/* TELA CHEIA */}
      {areasFull && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0B] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="disp text-[22px]">Cronograma por área</span>
            <button
              type="button"
              onClick={() => setAreasFull(false)}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
            >
              <span className="inline-block skew-x-9">✕ Fechar tela cheia</span>
            </button>
          </div>
          <ProgramacaoAreas
            cronograma={cronograma}
            layout="colunas"
            base={base}
            full
          />
        </div>
      )}

      {/* MODAL DE PLACAR (visualização) */}
      <ModalPlacar sel={lutaSel} onFechar={() => setLutaSel(null)} />
    </AbrirLutaCtx.Provider>
  );
}

function Stat({
  rotulo,
  valor,
  sub,
  destaque,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  destaque?: boolean;
}) {
  return (
    <div className="relative border border-white/10 bg-surface py-4 pl-6 pr-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
      <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
        {rotulo}
      </div>
      <div
        className={cn(
          "disp tnum mt-1.5 text-[38px] leading-none",
          destaque && "text-brand",
        )}
      >
        {valor}
      </div>
      <div className="mt-1.5 truncate font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
        {sub}
      </div>
    </div>
  );
}
