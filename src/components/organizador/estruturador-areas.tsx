"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";
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
import {
  CamposDiasEvento,
  type DiaEvento,
} from "@/components/organizador/campos-dias-evento";
import {
  PainelPorDia,
  type CategoriaFiltro,
  type DiaDistinto,
  type DimensoesGrade,
} from "@/components/organizador/painel-por-dia";
import { BotaoImprimirPrograma } from "@/components/organizador/botao-imprimir-programa";
import { useDic } from "@/lib/i18n/client";

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
  eventoNome,
  cronograma,
  dias,
  diasDistintos,
  dimensoes,
  categoriasFiltro,
  modoInicial,
  erro,
  estruturar,
  estruturarPorDia,
  salvarDias,
}: {
  categorias: CategoriaView[];
  numAreasInicial: number | null;
  /** caminho base do evento, ex.: `/organizador/eventos/:id` */
  base: string;
  /** nome do evento (título da programação imprimível) */
  eventoNome: string;
  /** cronograma real por área (persistido) — vazio quando não estruturado */
  cronograma: AreaCron[];
  /** dias do evento (data + início/fim), para configurar aqui também */
  dias: DiaEvento[];
  /** dias distintos do evento (para o modo "Por dia") */
  diasDistintos: DiaDistinto[];
  /** dimensões presentes na grade (classes/sexos/faixas) para os filtros por dia */
  dimensoes: DimensoesGrade;
  /** categorias enxutas (para casar os filtros no cliente) */
  categoriasFiltro: CategoriaFiltro[];
  /** modo em que a estrutura atual foi montada */
  modoInicial: "auto" | "porDia";
  /** aviso vindo do servidor (ex.: as lutas não cabem no período) */
  erro?: string;
  estruturar: (formData: FormData) => void | Promise<void>;
  estruturarPorDia: (formData: FormData) => void | Promise<void>;
  salvarDias: (formData: FormData) => void | Promise<void>;
}) {
  const [areasN, setAreasN] = useState(
    numAreasInicial ? String(numAreasInicial) : "",
  );
  const [modo, setModo] = useState<"auto" | "porDia">(modoInicial);
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

  const dic = useDic();
  const ta = dic.admin.areas;

  // ---- SEM CATEGORIAS: bloqueia com prompt para a seção Categorias ----
  if (!temCategorias) {
    return (
      <div className="relative border border-white/10 bg-surface px-[22px] py-12 text-center">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="disp text-[26px]">{ta.nenhumaCategoria}</div>
        <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-2">
          {ta.gereGradeAntes}
        </p>
        <Link
          href={`${base}/categorias`}
          className="mt-5 inline-flex -skew-x-9 items-center bg-brand px-5 py-3 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
        >
          <span className="inline-block skew-x-9">
            {ta.irPara} {dic.admin.nav.categorias} →
          </span>
        </Link>
      </div>
    );
  }

  const areasAtuais = cronograma.length;
  const media = areasAtuais ? Math.round(totalCategorias / areasAtuais) : 0;

  return (
    <AbrirLutaCtx.Provider value={setLutaSel}>
      {/* reajuste ao vivo: com cronograma na tela, re-busca o servidor (soft,
          preserva o estado do cliente) para os horários acompanharem as lutas */}
      {estruturado && <AutoRefresh segundos={30} />}

      {/* AVISO (ex.: as lutas não cabem no período) */}
      {erro && (
        <div className="flex items-start gap-3 border border-brand/40 bg-brand/10 px-[18px] py-4">
          <span className="mt-1.5 h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
          <p className="text-[15px] font-medium leading-normal text-foreground">
            {erro}
          </p>
        </div>
      )}

      {/* DIAS DO EVENTO (define o período em que as lutas são encaixadas) */}
      <div className="relative border border-white/10 bg-surface p-[22px]">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <form action={salvarDias} className="flex flex-col gap-4">
          <CamposDiasEvento labelCls="disp text-[22px]" defaultDias={dias} />
          <div className="flex justify-end">
            <BotaoAcaoBruto className="inline-flex -skew-x-9 items-center border border-white/16 px-5 py-2.5 font-cond text-[15px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-brand/50 hover:text-brand-soft">
              <span className="inline-block skew-x-9">{ta.salvarDias}</span>
            </BotaoAcaoBruto>
          </div>
        </form>
      </div>

      {/* SELETOR DE MODO: automático × por dia */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
          {ta.modoLabel}
        </span>
        <div className="flex">
          {(
            [
              ["auto", ta.modoAutomatico],
              ["porDia", ta.modoPorDia],
            ] as ["auto" | "porDia", string][]
          ).map(([val, rotulo]) => (
            <button
              key={val}
              type="button"
              onClick={() => setModo(val)}
              className={cn(
                "-skew-x-9 border px-4 py-2 font-cond text-[14px] font-semibold uppercase tracking-[0.04em] transition-colors",
                modo === val
                  ? "border-brand bg-brand text-white"
                  : "border-white/16 text-muted-2 hover:border-white/30",
              )}
            >
              <span className="inline-block skew-x-9">{rotulo}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CARD DE CONTROLE (modo automático) */}
      {modo === "auto" && (
      <div className="relative border border-white/10 bg-surface">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="grid items-center gap-x-8 gap-y-6 px-6 py-[26px] lg:grid-cols-[auto_1fr_auto]">
          {/* Nº de áreas */}
          <div>
            <label
              htmlFor="num-areas"
              className="mb-1.5 block font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3"
            >
              {ta.numeroAreas}
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
              {ta.categoriasCarregadas}
            </div>
            <div className="disp tnum mt-1.5 text-[38px] leading-none">
              {totalCategorias}
            </div>
            <div className="mt-1.5 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
              {ta.em} {gruposTotal} {gruposTotal === 1 ? ta.grupo : ta.grupos}
            </div>
          </div>

          {/* Estruturar */}
          <form action={estruturar} className="lg:justify-self-end">
            <input type="hidden" name="numAreas" value={nValido ? nInt : ""} />
            <BotaoAcaoBruto
              disabled={!nValido}
              className="inline-flex -skew-x-9 items-center bg-brand px-6 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-block skew-x-9">⚙ {ta.estruturarAreas}</span>
            </BotaoAcaoBruto>
          </form>
        </div>

        <p className="border-t border-white/10 px-6 py-3.5 font-cond text-[13px] uppercase leading-relaxed tracking-[0.03em] text-muted-3">
          {ta.ajudaOrdena}
        </p>
      </div>
      )}

      {/* PAINEL POR DIA (modo manual) */}
      {modo === "porDia" && (
        <PainelPorDia
          dias={diasDistintos}
          dimensoes={dimensoes}
          categorias={categoriasFiltro}
          areasN={areasN}
          setAreasN={setAreasN}
          estruturar={estruturarPorDia}
        />
      )}

      {/* LEGENDA DO FUNIL */}
      <div className="border border-white/10 bg-surface p-[22px]">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <span className="disp text-[22px]">{ta.ordemDoDia}</span>
          <span className="font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
            {ta.extremosMeio}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
          {classesDoFunil.map((c, i) => {
            const extremo = c.onda * 2 <= maiorOndaValor;
            return (
              <span key={c.id} className="flex items-center gap-1">
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
                    {dic.classesIdade[c.id] ?? c.nome}
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
            <Stat
              rotulo={dic.admin.nav.areas}
              valor={String(areasAtuais)}
              sub={ta.tatames}
              destaque
            />
            <Stat
              rotulo={dic.admin.nav.categorias}
              valor={String(totalCategorias)}
              sub={ta.naGrade}
            />
            <Stat
              rotulo={ta.mediaArea}
              valor={String(media)}
              sub={dic.admin.categorias.categorias}
            />
            <Stat
              rotulo={ta.statGrupos}
              valor={String(gruposTotal)}
              sub={ta.classeSexoFaixa}
            />
          </div>

          {/* BARRA DE AÇÃO */}
          <div className="flex flex-wrap justify-end gap-2">
            <BotaoImprimirPrograma cronograma={cronograma} eventoNome={eventoNome} />
            <button
              type="button"
              onClick={() => setAreasFull(true)}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
            >
              <span className="inline-block skew-x-9">⤢ {ta.expandirTelaCheia}</span>
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
            {ta.prontoEstruturar}
          </div>
          <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-3">
            {ta.informePre}{" "}
            <span className="text-brand-soft">{ta.estruturarAreas}</span>{" "}
            {ta.informeDistribuir} {totalCategorias}{" "}
            {dic.admin.categorias.categorias} {ta.informeMontar}
          </p>
        </div>
      )}

      {/* TELA CHEIA */}
      {areasFull && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0B] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="disp text-[22px]">{ta.cronogramaPorArea}</span>
            <button
              type="button"
              onClick={() => setAreasFull(false)}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
            >
              <span className="inline-block skew-x-9">✕ {ta.fecharTelaCheia}</span>
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
