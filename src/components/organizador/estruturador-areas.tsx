"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import {
  agruparExibicao,
  classesEmOrdem,
  contarGrupos,
  corDaOnda,
  distribuirBalanceado,
  maiorOndaDeCats,
} from "@/lib/categorias/distribuicao-areas";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROTULO_SEXO: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

const AREAS_MIN = 1;
const AREAS_MAX = 40;

/** categoria enxuta enviada ao cliente, já na ordem do dia */
export interface CategoriaView {
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  /** carga estimada (segundos) para o balanceamento */
  carga: number;
  /** lutas estimadas, só para exibir a carga por área */
  lutas: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function tituloGrupo(g: { classeNome: string; sexo: string; faixa: string }): string {
  const base = `${g.classeNome} · ${ROTULO_SEXO[g.sexo] ?? cap(g.sexo)}`;
  return g.faixa ? `${base} · ${cap(g.faixa)}` : base;
}

export function EstruturadorAreas({
  categorias,
  numAreasInicial,
  base,
  areaIds,
  estruturar,
}: {
  categorias: CategoriaView[];
  numAreasInicial: number | null;
  /** caminho base do evento, ex.: `/organizador/eventos/:id` */
  base: string;
  areaIds: string[];
  estruturar: (formData: FormData) => void | Promise<void>;
}) {
  const [areasN, setAreasN] = useState(
    numAreasInicial ? String(numAreasInicial) : "",
  );
  // número já APLICADO (persistido): a prévia reflete este valor, não o que
  // está sendo digitado — só muda ao clicar em "Estruturar áreas".
  const [aplicado, setAplicado] = useState<number | null>(numAreasInicial);

  const nInt = Math.floor(Number(areasN));
  const nValido = Number.isFinite(nInt) && nInt >= AREAS_MIN && nInt <= AREAS_MAX;
  const totalCategorias = categorias.length;
  const temCategorias = totalCategorias > 0;

  const maiorOndaValor = useMemo(() => maiorOndaDeCats(categorias), [categorias]);
  const gruposTotal = useMemo(() => contarGrupos(categorias), [categorias]);
  const classesDoFunil = useMemo(() => classesEmOrdem(categorias), [categorias]);

  // alocação balanceada por área — calculada sobre o número APLICADO, não
  // sobre o que está no input (a prévia só muda ao clicar em Estruturar)
  const porArea = useMemo(
    () =>
      aplicado != null
        ? distribuirBalanceado(categorias, aplicado).map((cats) => ({
            grupos: agruparExibicao(cats),
            totalCats: cats.length,
            lutas: cats.reduce((s, c) => s + c.lutas, 0),
          }))
        : [],
    [categorias, aplicado],
  );

  const mostrarPreview = aplicado != null && temCategorias;
  // só liga o placar quando a estrutura aplicada bate com as áreas persistidas
  const placarLigado = aplicado != null && areaIds.length === aplicado;

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

  const media = aplicado ? Math.round(totalCategorias / aplicado) : 0;

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
              em {gruposTotal} grupo{gruposTotal === 1 ? "" : "s"}
            </div>
          </div>

          {/* Estruturar */}
          <form
            action={async (fd) => {
              await estruturar(fd);
              // aplica a prévia só depois que a estruturação foi persistida
              const n = Math.floor(Number(fd.get("numAreas")));
              if (Number.isFinite(n)) setAplicado(n);
            }}
            className="lg:justify-self-end"
          >
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
          espalha as categorias pelas áreas equilibrando a carga, sem deixar
          nenhuma área vazia.
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
            <Stat rotulo="Áreas" valor={String(aplicado ?? 0)} sub="tatames" destaque />
            <Stat
              rotulo="Categorias"
              valor={String(totalCategorias)}
              sub="na grade"
            />
            <Stat rotulo="Média / área" valor={String(media)} sub="categorias" />
            <Stat
              rotulo="Grupos"
              valor={String(gruposTotal)}
              sub="classe · sexo · faixa"
            />
          </div>

          {/* CARDS POR ÁREA */}
          <div className="grid gap-4 md:grid-cols-2">
            {porArea.map((area, i) => {
              const visiveis = area.grupos.slice(0, 6);
              const ocultos = area.grupos.length - visiveis.length;
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
                        {area.grupos.length} grupo
                        {area.grupos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div>
                        <span className="disp tnum text-[28px] leading-none text-brand">
                          {area.totalCats}
                        </span>
                        <span className="ml-1.5 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                          cat.
                        </span>
                      </div>
                      {area.lutas > 0 && (
                        <div className="tnum font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
                          ~{area.lutas} lutas
                        </div>
                      )}
                    </div>
                  </div>

                  {area.grupos.length === 0 ? (
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
            distribuir as {totalCategorias} categorias.
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
