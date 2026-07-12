"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import type {
  AreaCron,
  CategoriaCron,
  LutaCron,
} from "@/lib/cronograma/cronograma-areas";

/**
 * Programação de lutas por área — o "cronograma por área" visual, compartilhado
 * entre a seção **Áreas** do organizador e a aba **Cronograma** pública.
 *
 * `layout` decide a disposição das áreas:
 * - `colunas`: lado a lado com scroll lateral e altura travada (organizador).
 * - `grade`: grade responsiva (até 3 colunas) de altura natural (aba pública).
 * - `empilhado`: uma área embaixo da outra, largura cheia.
 *
 * Clicar numa luta abre o modal de placar (somente leitura). O consumidor provê
 * o `AbrirLutaCtx` e renderiza o `ModalPlacar`, controlando a luta selecionada.
 */

export type LayoutAreas = "colunas" | "grade" | "empilhado";

/** luta escolhida para o modal de placar (com o contexto da categoria) */
export interface LutaSelecionada {
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
}

/** abre o modal de placar a partir de qualquer linha de luta (evita prop drilling) */
export const AbrirLutaCtx = createContext<(sel: LutaSelecionada) => void>(
  () => {},
);

/** container das áreas — lado a lado (colunas) ou empilhadas */
export function ProgramacaoAreas({
  cronograma,
  layout,
  base,
  full = false,
}: {
  cronograma: AreaCron[];
  layout: LayoutAreas;
  /** caminho base do evento (organizador) — mostra o rodapé "Operar placar" */
  base?: string;
  /** tela cheia do organizador (só afeta o layout de colunas) */
  full?: boolean;
}) {
  const colunas = layout === "colunas";
  const grade = layout === "grade";
  return (
    <div
      className={cn(
        colunas && "flex gap-4 overflow-x-auto pb-2",
        colunas && full && "min-h-0 flex-1",
        layout === "empilhado" && "flex flex-col gap-4",
        grade &&
          cn(
            "grid grid-cols-1 items-start gap-4 sm:grid-cols-2",
            cronograma.length > 2 ? "lg:grid-cols-3" : "lg:grid-cols-2",
          ),
      )}
    >
      {cronograma.map((area) => (
        <CardArea
          key={area.id}
          area={area}
          layout={layout}
          base={base}
          full={full}
        />
      ))}
    </div>
  );
}

/** uma área (tatame): header + corpo de categorias (+ rodapé no organizador) */
function CardArea({
  area,
  layout,
  base,
  full,
}: {
  area: AreaCron;
  layout: LayoutAreas;
  base?: string;
  full: boolean;
}) {
  const colunas = layout === "colunas";
  const dp = useDic().placar;
  return (
    <div
      className={cn(
        "relative flex flex-col border border-white/10 bg-surface",
        colunas ? "w-[360px] shrink-0" : "w-full",
      )}
      style={colunas ? { maxHeight: full ? "88vh" : "76vh" } : undefined}
    >
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* HEADER */}
      <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="disp tnum text-[24px] leading-none">{area.nome}</span>
          <div>
            <span className="disp tnum text-[24px] leading-none text-brand">
              {area.totalCats}
            </span>
            <span className="ml-1 font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
              {dp.catAbrev}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
          <span>
            {area.totalGrupos} {area.totalGrupos === 1 ? dp.grupo : dp.grupos}
          </span>
          <span className="tnum">
            {area.dataLabel} · {area.inicio} → {area.fim}
          </span>
        </div>
      </div>

      {/* CORPO (scroll interno só no layout de colunas) */}
      <div className={colunas ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
        {area.categorias.length === 0 ? (
          <div className="px-4 py-8 text-center font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
            {dp.semCategorias}
          </div>
        ) : (
          area.categorias.map((cat, i) => <BlocoCategoria key={i} cat={cat} />)
        )}
      </div>

      {/* RODAPÉ (organizador: operar placar) */}
      {base && (
        <div className="shrink-0 border-t border-white/10 px-4 py-2.5 text-right">
          <Link
            href={`${base}/areas/${area.id}/placar`}
            className="font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            {dp.operarPlacar} →
          </Link>
        </div>
      )}
    </div>
  );
}

/** bloco de uma categoria: linha-destaque + suas lutas (ou roster) */
function BlocoCategoria({ cat }: { cat: CategoriaCron }) {
  const dp = useDic().placar;
  return (
    <div>
      {/* LINHA DA CATEGORIA (destaque forte) */}
      <div className="relative border-b border-[rgba(238,46,36,0.25)] bg-[rgba(238,46,36,0.09)] py-2.5 pl-5 pr-4">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <span
              className="mt-[3px] h-3 w-3 shrink-0 -skew-x-9 border border-white/25"
              style={{ background: corDaFaixa(cat.faixa) }}
            />
            <div className="min-w-0">
              <div className="truncate font-cond text-sm font-bold uppercase tracking-[0.02em] text-white">
                {cat.titulo}
              </div>
              <div className="truncate font-cond text-[12px] uppercase tracking-[0.03em] text-muted-2">
                {cat.subtitulo}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex -skew-x-9 items-center bg-brand px-2 py-0.5">
              <span className="disp tnum inline-block skew-x-9 text-[15px] leading-none text-white">
                {cat.hora}
              </span>
            </span>
            <div className="tnum mt-1 font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
              {cat.nLutas} {cat.nLutas === 1 ? dp.luta : dp.lutas}
            </div>
          </div>
        </div>
      </div>

      {/* LUTAS (ou roster quando a chave ainda não foi gerada) */}
      {cat.chaveGerada ? (
        <ul className="flex flex-col">
          {cat.lutas.map((l, i) => (
            <LinhaLuta
              key={i}
              luta={l}
              catTitulo={cat.titulo}
              catSubtitulo={cat.subtitulo}
            />
          ))}
        </ul>
      ) : (
        <div className="px-4 py-2">
          <div className="mb-1 font-cond text-[10px] uppercase tracking-[0.08em] text-muted-3">
            {cat.atletas.length > 0 ? dp.chaveNaoGerada : dp.semAtletas}
          </div>
          {cat.atletas.length > 0 && (
            <ul className="flex flex-col">
              {cat.atletas.map((nome, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 py-0.5 font-cond text-[12px] uppercase tracking-[0.01em] text-muted-2"
                >
                  <span className="tnum w-5 shrink-0 text-muted-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{nome}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** uma luta: bloco de tempo · dois nomes · resultado (W/L). Clicar abre o placar. */
function LinhaLuta({
  luta,
  catTitulo,
  catSubtitulo,
}: {
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
}) {
  const abrir = useContext(AbrirLutaCtx);
  return (
    <li className="border-b border-white/6 last:border-b-0">
      <button
        type="button"
        onClick={() => abrir({ luta, catTitulo, catSubtitulo })}
        className="flex w-full items-stretch gap-2.5 px-4 py-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
      >
        <div className="w-11 shrink-0 pt-0.5">
          <div className="disp tnum text-[15px] leading-none">{luta.hora}</div>
          <div className="mt-1 font-cond text-[10px] uppercase tracking-[0.06em] text-muted-3">
            {luta.label}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <NomeAtleta nome={luta.a1} estado={estadoAtleta(luta, 1)} />
          <NomeAtleta nome={luta.a2} estado={estadoAtleta(luta, 2)} />
        </div>
        <div className="flex shrink-0 flex-col justify-center gap-1">
          <ResultadoBox estado={estadoAtleta(luta, 1)} />
          <ResultadoBox estado={estadoAtleta(luta, 2)} />
        </div>
      </button>
    </li>
  );
}

export type EstadoAtleta = "vencedor" | "perdedor" | "neutro" | "indefinido";

/** estado de um atleta na luta: decide destaque do nome e da caixa de placar */
export function estadoAtleta(luta: LutaCron, slot: 1 | 2): EstadoAtleta {
  const nome = slot === 1 ? luta.a1 : luta.a2;
  if (nome === "A definir") return "indefinido";
  if (!luta.decidida) return "neutro";
  return luta.vencedor === slot ? "vencedor" : "perdedor";
}

export function NomeAtleta({
  nome,
  estado,
}: {
  nome: string;
  estado: EstadoAtleta;
}) {
  const dp = useDic().placar;
  return (
    <span
      className={cn(
        "truncate font-cond text-[13px] uppercase tracking-[0.01em]",
        estado === "vencedor" && "font-semibold text-foreground",
        estado === "perdedor" && "text-[#6B6A64]",
        estado === "neutro" && "text-muted-2",
        estado === "indefinido" && "italic text-muted-3",
      )}
    >
      {nome === "A definir" ? dp.aDefinir : nome}
    </span>
  );
}

/** caixa de resultado: W (vencedor), L (perdedor) ou – (sem resultado ainda) */
export function ResultadoBox({ estado }: { estado: EstadoAtleta }) {
  const rotulo =
    estado === "vencedor" ? "W" : estado === "perdedor" ? "L" : "–";
  return (
    <span
      className={cn(
        "disp flex h-6 w-8 items-center justify-center text-[14px] font-bold leading-none",
        estado === "vencedor"
          ? "bg-brand text-white"
          : "border border-white/10 bg-background",
        estado === "perdedor" && "text-[#6B6A64]",
        (estado === "neutro" || estado === "indefinido") && "text-muted-3",
      )}
    >
      {rotulo}
    </span>
  );
}

/** modal de visualização do placar de uma luta (somente leitura) */
export function ModalPlacar({
  sel,
  onFechar,
}: {
  sel: LutaSelecionada | null;
  onFechar: () => void;
}) {
  const dp = useDic().placar;
  if (!sel) return null;
  const { luta, catTitulo, catSubtitulo } = sel;

  const temParcial =
    luta.score1 +
      luta.score2 +
      luta.vantagens1 +
      luta.vantagens2 +
      luta.punicoes1 +
      luta.punicoes2 >
    0;
  const status = luta.decidida
    ? dp.statusEncerrada
    : temParcial
      ? dp.statusEmAndamento
      : dp.statusARealizar;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-md border border-white/12 bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />

        {/* HEADER: categoria + fechar */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <div className="disp truncate text-[22px] leading-tight">
              {catTitulo}
            </div>
            <div className="mt-0.5 truncate font-cond text-[12px] uppercase tracking-[0.04em] text-muted-2">
              {catSubtitulo}
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label={dp.fechar}
            className="shrink-0 font-cond text-[15px] uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            ✕
          </button>
        </div>

        {/* META: horário · luta · status */}
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-2.5">
          <span className="inline-flex -skew-x-9 items-center bg-brand px-2 py-0.5">
            <span className="disp tnum inline-block skew-x-9 text-[15px] leading-none text-white">
              {luta.hora}
            </span>
          </span>
          <span className="font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-2">
            {luta.label}
          </span>
          <span className="ml-auto font-cond text-[11px] uppercase tracking-[0.06em] text-muted-3">
            {status}
          </span>
        </div>

        {/* PLACAR: dois atletas */}
        <div className="flex flex-col">
          <AtletaPlacar
            nome={luta.a1}
            pontos={luta.score1}
            vantagens={luta.vantagens1}
            punicoes={luta.punicoes1}
            estado={estadoAtleta(luta, 1)}
          />
          <AtletaPlacar
            nome={luta.a2}
            pontos={luta.score2}
            vantagens={luta.vantagens2}
            punicoes={luta.punicoes2}
            estado={estadoAtleta(luta, 2)}
          />
        </div>

        {/* MÉTODO (quando encerrada) */}
        {luta.decidida && luta.metodo && (
          <div className="border-t border-white/10 px-5 py-3 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-2">
            {dp.vitoriaPor}{" "}
            <span className="font-semibold text-foreground">{luta.metodo}</span>
            {luta.finalizacao ? ` · ${luta.finalizacao}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/** uma linha de atleta no modal: W/L · nome · vantagens/punições · pontos */
function AtletaPlacar({
  nome,
  pontos,
  vantagens,
  punicoes,
  estado,
}: {
  nome: string;
  pontos: number;
  vantagens: number;
  punicoes: number;
  estado: EstadoAtleta;
}) {
  const dp = useDic().placar;
  const vencedor = estado === "vencedor";
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-white/8 px-5 py-4 last:border-b-0",
        vencedor && "bg-[rgba(238,46,36,0.08)]",
      )}
    >
      <span
        className={cn(
          "disp flex h-7 w-7 shrink-0 items-center justify-center text-[15px] font-bold leading-none",
          vencedor ? "bg-brand text-white" : "border border-white/12 bg-background",
          estado === "perdedor" && "text-[#6B6A64]",
          (estado === "neutro" || estado === "indefinido") && "text-muted-3",
        )}
      >
        {estado === "vencedor" ? "W" : estado === "perdedor" ? "L" : "–"}
      </span>

      <div className="min-w-0 flex-1">
        <NomeAtleta nome={nome} estado={estado} />
      </div>

      <div className="flex shrink-0 items-start gap-3">
        <MiniPlacar rotulo={dp.vnt} valor={vantagens} />
        <MiniPlacar rotulo={dp.pun} valor={punicoes} />
      </div>

      <span
        className={cn(
          "disp tnum shrink-0 text-right text-[34px] leading-none",
          vencedor
            ? "text-brand"
            : estado === "perdedor"
              ? "text-[#6B6A64]"
              : "text-foreground",
        )}
      >
        {pontos}
      </span>
    </div>
  );
}

/** coluninha de vantagens/punições no modal */
function MiniPlacar({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-cond text-[9px] uppercase tracking-[0.08em] text-muted-3">
        {rotulo}
      </span>
      <span className="disp tnum mt-0.5 text-[15px] leading-none text-muted-2">
        {valor}
      </span>
    </div>
  );
}
