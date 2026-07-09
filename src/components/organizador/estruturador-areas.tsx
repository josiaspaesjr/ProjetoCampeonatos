"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { corDaOnda, distribuirEmAreas } from "@/lib/categorias/distribuicao-areas";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROTULO_SEXO: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

const AREAS_MIN = 1;
const AREAS_MAX = 40;

/** grupo (classe·sexo·faixa) na forma leve enviada ao cliente */
export interface GrupoView {
  chave: string;
  classeNome: string;
  onda: number;
  sexo: string;
  faixa: string;
  pesos: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function tituloGrupo(g: GrupoView): string {
  const base = `${g.classeNome} · ${ROTULO_SEXO[g.sexo] ?? cap(g.sexo)}`;
  return g.faixa ? `${base} · ${cap(g.faixa)}` : base;
}

export function EstruturadorAreas({
  grupos,
  totalCategorias,
  numAreasInicial,
  estruturado: estruturadoInicial,
  base,
  areaIds,
  estruturar,
}: {
  grupos: GrupoView[];
  totalCategorias: number;
  numAreasInicial: number | null;
  estruturado: boolean;
  /** caminho base do evento, ex.: `/organizador/eventos/:id` */
  base: string;
  areaIds: string[];
  estruturar: (formData: FormData) => void | Promise<void>;
}) {
  const [areasN, setAreasN] = useState(
    numAreasInicial ? String(numAreasInicial) : "",
  );
  const [estruturado, setEstruturado] = useState(estruturadoInicial);

  const nInt = Math.floor(Number(areasN));
  const nValido = Number.isFinite(nInt) && nInt >= AREAS_MIN && nInt <= AREAS_MAX;
  const temGrupos = grupos.length > 0;

  const maiorOndaValor = useMemo(
    () => Math.max(1, ...grupos.map((g) => g.onda)),
    [grupos],
  );

  // classes distintas na ordem do dia (para a legenda do funil)
  const classesDoFunil = useMemo(() => {
    const vistas = new Map<string, number>();
    for (const g of grupos) {
      if (!vistas.has(g.classeNome)) vistas.set(g.classeNome, g.onda);
    }
    return [...vistas].map(([nome, onda]) => ({ nome, onda }));
  }, [grupos]);

  // alocação por área (round-robin), recomputada ao vivo com o nº de áreas
  const porArea = useMemo(
    () => (nValido ? distribuirEmAreas(grupos, nInt) : []),
    [grupos, nInt, nValido],
  );

  const mostrarPreview = estruturado && nValido && temGrupos;
  // só liga o placar quando a prévia bate com a estrutura persistida
  const placarLigado = estruturado && areaIds.length === nInt;

  // ---- SEM CATEGORIAS: bloqueia com prompt para a seção Categorias ----
  if (!temGrupos) {
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

  const media = mostrarPreview ? Math.round(totalCategorias / nInt) : 0;

  return (
    <>
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
              em {grupos.length} grupo{grupos.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Estruturar */}
          <form action={estruturar} className="lg:justify-self-end">
            <input type="hidden" name="numAreas" value={nValido ? nInt : ""} />
            <BotaoAcaoBruto
              disabled={!nValido}
              onClick={() => setEstruturado(true)}
              className="inline-flex -skew-x-9 items-center bg-brand px-6 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-block skew-x-9">⚙ Estruturar áreas</span>
            </BotaoAcaoBruto>
          </form>
        </div>

        <p className="border-t border-white/10 px-6 py-3.5 font-cond text-[13px] uppercase leading-relaxed tracking-[0.03em] text-muted-3">
          O sistema agrupa a grade por classe · sexo · faixa e distribui os
          grupos pelas áreas numa ordem que vai dos extremos ao meio — kids e
          masters mais velhos liberam cedo, o miolo (Adulto / Master 1) corre
          por último.
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

      {mostrarPreview ? (
        <>
          {/* RESUMO — 4 STATS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat rotulo="Áreas" valor={String(nInt)} sub="tatames" destaque />
            <Stat
              rotulo="Categorias"
              valor={String(totalCategorias)}
              sub="na grade"
            />
            <Stat rotulo="Média / área" valor={String(media)} sub="categorias" />
            <Stat
              rotulo="Grupos"
              valor={String(grupos.length)}
              sub="classe · sexo · faixa"
            />
          </div>

          {/* CARDS POR ÁREA */}
          <div className="grid gap-4 md:grid-cols-2">
            {porArea.map((gruposDaArea, i) => {
              const totalCats = gruposDaArea.reduce((s, g) => s + g.pesos, 0);
              const visiveis = gruposDaArea.slice(0, 6);
              const ocultos = gruposDaArea.length - visiveis.length;
              return (
                <div
                  key={i}
                  className="relative border border-white/10 bg-surface"
                >
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="disp tnum text-[26px] leading-none">
                        Área {pad2(i + 1)}
                      </span>
                      <span className="font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
                        {gruposDaArea.length} grupo
                        {gruposDaArea.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="disp tnum text-[28px] leading-none text-brand">
                        {totalCats}
                      </span>
                      <span className="ml-1.5 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                        cat.
                      </span>
                    </div>
                  </div>

                  {gruposDaArea.length === 0 ? (
                    <div className="px-5 py-6 text-center font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
                      Sem grupos nesta área
                    </div>
                  ) : (
                    <ul className="flex flex-col">
                      {visiveis.map((g, j) => (
                        <li
                          key={g.chave}
                          className="flex items-center gap-3 border-b border-white/6 px-5 py-2.5 last:border-b-0"
                        >
                          <span className="tnum w-6 shrink-0 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
                            {pad2(j + 1)}
                          </span>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            title={`onda ${g.onda}`}
                            style={{ background: corDaOnda(g.onda, maiorOndaValor) }}
                          />
                          <span
                            className="h-3 w-3 shrink-0 -skew-x-9 border border-white/25"
                            style={{ background: corDaFaixa(g.faixa || null) }}
                          />
                          <span className="min-w-0 flex-1 truncate font-cond text-sm font-semibold uppercase tracking-[0.02em]">
                            {tituloGrupo(g)}
                          </span>
                          <span className="tnum shrink-0 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                            {g.pesos} peso{g.pesos === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {(ocultos > 0 || placarLigado) && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-2.5">
                      <span className="font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                        {ocultos > 0 ? `+ ${ocultos} grupos nesta área` : ""}
                      </span>
                      {placarLigado && areaIds[i] && (
                        <Link
                          href={`${base}/areas/${areaIds[i]}/placar`}
                          className="font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
                        >
                          Operar placar →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            distribuir os {grupos.length} grupos.
          </p>
        </div>
      )}
    </>
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
