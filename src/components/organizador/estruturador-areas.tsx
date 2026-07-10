"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import {
  classesEmOrdem,
  contarGrupos,
  corDaOnda,
  maiorOndaDeCats,
} from "@/lib/categorias/distribuicao-areas";
import type {
  AreaCron,
  CategoriaCron,
  LutaCron,
} from "@/lib/cronograma/cronograma-areas";

const AREAS_MIN = 1;
const AREAS_MAX = 40;

/** luta escolhida para o modal de placar (com o contexto da categoria) */
interface LutaSelecionada {
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
}

/** abre o modal de placar a partir de qualquer linha de luta (evita prop drilling) */
const AbrirLutaCtx = createContext<(sel: LutaSelecionada) => void>(() => {});

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
          <ColunasAreas cronograma={cronograma} base={base} full={false} />
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
          <ColunasAreas cronograma={cronograma} base={base} full />
        </div>
      )}

      {/* MODAL DE PLACAR (visualização) */}
      <ModalPlacar sel={lutaSel} onFechar={() => setLutaSel(null)} />
    </AbrirLutaCtx.Provider>
  );
}

/** container flex horizontal das colunas de área */
function ColunasAreas({
  cronograma,
  base,
  full,
}: {
  cronograma: AreaCron[];
  base: string;
  full: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 overflow-x-auto pb-2",
        full && "min-h-0 flex-1",
      )}
    >
      {cronograma.map((area) => (
        <Coluna key={area.id} area={area} base={base} full={full} />
      ))}
    </div>
  );
}

/** uma coluna = uma área (tatame): header + rodapé fixos, corpo com scroll */
function Coluna({
  area,
  base,
  full,
}: {
  area: AreaCron;
  base: string;
  full: boolean;
}) {
  return (
    <div
      className="relative flex w-[360px] shrink-0 flex-col border border-white/10 bg-surface"
      style={{ maxHeight: full ? "88vh" : "76vh" }}
    >
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* HEADER FIXO */}
      <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="disp tnum text-[24px] leading-none">{area.nome}</span>
          <div>
            <span className="disp tnum text-[24px] leading-none text-brand">
              {area.totalCats}
            </span>
            <span className="ml-1 font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
              cat.
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
          <span>
            {area.totalGrupos} grupo{area.totalGrupos === 1 ? "" : "s"}
          </span>
          <span className="tnum">
            {area.dataLabel} · {area.inicio} → {area.fim}
          </span>
        </div>
      </div>

      {/* CORPO COM SCROLL */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {area.categorias.length === 0 ? (
          <div className="px-4 py-8 text-center font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
            Sem categorias nesta área
          </div>
        ) : (
          area.categorias.map((cat, i) => <BlocoCategoria key={i} cat={cat} />)
        )}
      </div>

      {/* RODAPÉ FIXO */}
      <div className="shrink-0 border-t border-white/10 px-4 py-2.5 text-right">
        <Link
          href={`${base}/areas/${area.id}/placar`}
          className="font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
        >
          Operar placar →
        </Link>
      </div>
    </div>
  );
}

/** bloco de uma categoria: linha-destaque + suas lutas (ou roster) */
function BlocoCategoria({ cat }: { cat: CategoriaCron }) {
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
              {cat.nLutas} luta{cat.nLutas === 1 ? "" : "s"}
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
            {cat.atletas.length > 0
              ? "Chave não gerada · inscritos"
              : "Sem atletas confirmados"}
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

type EstadoAtleta = "vencedor" | "perdedor" | "neutro" | "indefinido";

/** estado de um atleta na luta: decide destaque do nome e da caixa de placar */
function estadoAtleta(luta: LutaCron, slot: 1 | 2): EstadoAtleta {
  const nome = slot === 1 ? luta.a1 : luta.a2;
  if (nome === "A definir") return "indefinido";
  if (!luta.decidida) return "neutro";
  return luta.vencedor === slot ? "vencedor" : "perdedor";
}

function NomeAtleta({ nome, estado }: { nome: string; estado: EstadoAtleta }) {
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
      {nome}
    </span>
  );
}

/** caixa de resultado: W (vencedor), L (perdedor) ou – (sem resultado ainda) */
function ResultadoBox({ estado }: { estado: EstadoAtleta }) {
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
function ModalPlacar({
  sel,
  onFechar,
}: {
  sel: LutaSelecionada | null;
  onFechar: () => void;
}) {
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
    ? "Encerrada"
    : temParcial
      ? "Em andamento"
      : "A realizar";

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
            aria-label="Fechar"
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
            Vitória por{" "}
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
        <MiniPlacar rotulo="VNT" valor={vantagens} />
        <MiniPlacar rotulo="PUN" valor={punicoes} />
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
