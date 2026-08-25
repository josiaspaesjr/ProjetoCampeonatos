"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import {
  AbrirLutaCtx,
  estadoAtleta,
  NomeAtleta,
  ResultadoBox,
} from "@/components/cronograma/programacao-areas";
import type { AreaCron, LutaCron } from "@/lib/cronograma/cronograma-areas";

/** teto de linhas exibidas — busca ampla não vira uma lista infinita */
const MAX_RESULTADOS = 40;

/** uma luta encontrada, com o contexto de área/categoria */
interface AchadoLuta {
  tipo: "luta";
  chave: string;
  area: string;
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
  faixa: string | null;
}

/** uma categoria encontrada (sem chave gerada: casa pelo roster/título) */
interface AchadoCategoria {
  tipo: "categoria";
  chave: string;
  area: string;
  titulo: string;
  subtitulo: string;
  faixa: string | null;
  hora: string;
  dataLabel: string;
  nLutas: number;
  /** atletas do roster que casaram com a busca */
  atletas: string[];
}

type Achado = AchadoLuta | AchadoCategoria;

/** normaliza para busca: minúsculas sem acento */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Busca dentro do cronograma já distribuído: acha por **atleta**, **categoria**
 * ou **área** e mostra onde e quando aquilo acontece. Lutas de chave gerada
 * abrem o placar no clique (mesmo modal das colunas de área); categorias ainda
 * sem chave aparecem com o horário previsto e os atletas do roster que casaram.
 */
export function BuscaCronograma({ cronograma }: { cronograma: AreaCron[] }) {
  const dic = useDic();
  const ta = dic.admin.areas;
  const abrirLuta = useContext(AbrirLutaCtx);
  const [busca, setBusca] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // abre já com o cursor no campo
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = norm(busca.trim());

  const achados = useMemo<Achado[]>(() => {
    if (!q) return [];
    const res: Achado[] = [];
    for (const area of cronograma) {
      const areaCasa = norm(area.nome).includes(q);
      for (const cat of area.categorias) {
        const catCasa =
          areaCasa || norm(`${cat.titulo} ${cat.subtitulo}`).includes(q);

        if (cat.lutas.length) {
          for (const luta of cat.lutas) {
            if (catCasa || norm(`${luta.a1} ${luta.a2}`).includes(q)) {
              res.push({
                tipo: "luta",
                chave: luta.id,
                area: area.nome,
                luta,
                catTitulo: cat.titulo,
                catSubtitulo: cat.subtitulo,
                faixa: cat.faixa,
              });
            }
          }
          continue;
        }

        // sem chave gerada: casa pelo roster de inscritos
        const atletas = cat.atletas.filter((a) => norm(a).includes(q));
        if (catCasa || atletas.length) {
          res.push({
            tipo: "categoria",
            chave: `${area.nome}:${cat.titulo}:${cat.hora}`,
            area: area.nome,
            titulo: cat.titulo,
            subtitulo: cat.subtitulo,
            faixa: cat.faixa,
            hora: cat.hora,
            dataLabel: cat.dataLabel,
            nLutas: cat.nLutas,
            atletas: catCasa ? cat.atletas : atletas,
          });
        }
      }
    }
    return res;
  }, [cronograma, q]);

  const visiveis = achados.slice(0, MAX_RESULTADOS);
  const sobra = achados.length - visiveis.length;
  // evento multi-dia → vale mostrar a data junto do horário
  const multiDia = useMemo(
    () => new Set(cronograma.flatMap((a) => a.dias.map((d) => d.data))).size > 1,
    [cronograma],
  );

  return (
    <div className="relative border border-white/10 bg-surface p-[18px]">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />

      <input
        ref={inputRef}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={ta.buscarPlaceholder}
        className="w-full border border-white/14 bg-background px-4 py-2.5 font-cond text-[15px] uppercase tracking-[0.02em] text-foreground placeholder:text-muted-3 focus:border-brand focus:outline-none"
      />

      {!q ? (
        <p className="mt-3 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
          {ta.buscarDigite}
        </p>
      ) : achados.length === 0 ? (
        <p className="mt-3 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
          {ta.buscarVazio}
        </p>
      ) : (
        <>
          <p className="mt-3 font-cond text-[12px] uppercase tracking-[0.05em] text-muted-3">
            <span className="tnum text-foreground">{achados.length}</span>{" "}
            {achados.length === 1 ? ta.buscarResultado : ta.buscarResultados}
          </p>

          <ul className="mt-2 flex flex-col border-t border-white/8">
            {visiveis.map((a) =>
              a.tipo === "luta" ? (
                <li key={a.chave} className="border-b border-white/8">
                  <button
                    type="button"
                    onClick={() =>
                      abrirLuta({
                        luta: a.luta,
                        catTitulo: a.catTitulo,
                        catSubtitulo: a.catSubtitulo,
                      })
                    }
                    className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                  >
                    <Quando
                      hora={a.luta.hora}
                      dataLabel={a.luta.dataLabel}
                      multiDia={multiDia}
                    />
                    <Contexto
                      area={a.area}
                      titulo={a.catTitulo}
                      subtitulo={a.catSubtitulo}
                      faixa={a.faixa}
                    />
                    <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
                      <div className="flex min-w-0 flex-col gap-1">
                        <NomeAtleta
                          nome={a.luta.a1}
                          estado={estadoAtleta(a.luta, 1)}
                        />
                        <NomeAtleta
                          nome={a.luta.a2}
                          estado={estadoAtleta(a.luta, 2)}
                        />
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <ResultadoBox estado={estadoAtleta(a.luta, 1)} />
                        <ResultadoBox estado={estadoAtleta(a.luta, 2)} />
                      </div>
                    </div>
                  </button>
                </li>
              ) : (
                <li
                  key={a.chave}
                  className="flex items-center gap-3 border-b border-white/8 px-1 py-2.5"
                >
                  <Quando
                    hora={a.hora}
                    dataLabel={a.dataLabel}
                    multiDia={multiDia}
                  />
                  <Contexto
                    area={a.area}
                    titulo={a.titulo}
                    subtitulo={a.subtitulo}
                    faixa={a.faixa}
                  />
                  <div className="ml-auto min-w-0 text-right">
                    <div className="truncate font-cond text-[12px] uppercase tracking-[0.03em] text-muted-2">
                      {a.atletas.join(" · ")}
                    </div>
                    <div className="font-cond text-[11px] uppercase tracking-[0.05em] text-muted-3">
                      <span className="tnum">{a.nLutas}</span>{" "}
                      {a.nLutas === 1 ? dic.lutasTab.luta : dic.lutasTab.lutas}{" "}
                      · {ta.buscarSemChave}
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>

          {sobra > 0 && (
            <p className="mt-2 font-cond text-[12px] uppercase tracking-[0.05em] text-muted-3">
              +<span className="tnum">{sobra}</span> {ta.buscarMais}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** bloco de horário (com a data quando o evento tem mais de um dia) */
function Quando({
  hora,
  dataLabel,
  multiDia,
}: {
  hora: string;
  dataLabel: string;
  multiDia: boolean;
}) {
  return (
    <div className="w-14 shrink-0">
      {multiDia && (
        <div className="tnum font-cond text-[10px] uppercase leading-none tracking-[0.04em] text-brand-soft">
          {dataLabel}
        </div>
      )}
      <div className="disp tnum text-[15px] leading-tight">{hora}</div>
    </div>
  );
}

/** área + categoria (com o marcador da faixa) */
function Contexto({
  area,
  titulo,
  subtitulo,
  faixa,
}: {
  area: string;
  titulo: string;
  subtitulo: string;
  faixa: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className="mt-1 h-3 w-3 shrink-0 -skew-x-9 border border-white/25"
        style={{ background: corDaFaixa(faixa) }}
      />
      <div className="min-w-0">
        <div className="truncate font-cond text-[13px] font-semibold uppercase tracking-[0.02em] text-foreground">
          {titulo}
        </div>
        <div className="truncate font-cond text-[11px] uppercase tracking-[0.05em] text-muted-3">
          <span className="text-brand-soft">{area}</span>{" "}
          · {subtitulo}
        </div>
      </div>
    </div>
  );
}
