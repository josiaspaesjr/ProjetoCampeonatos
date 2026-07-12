"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  AbrirLutaCtx,
  estadoAtleta,
  ModalPlacar,
  NomeAtleta,
  ResultadoBox,
  type LutaSelecionada,
} from "@/components/cronograma/programacao-areas";
import type { LutaCron } from "@/lib/cronograma/cronograma-areas";

/** uma luta na lista, com o contexto de área/categoria e academias */
export interface LutaItem {
  area: string;
  luta: LutaCron;
  catTitulo: string;
  catSubtitulo: string;
  academia1: string | null;
  academia2: string | null;
}

/** normaliza para busca: minúsculas sem acento */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Aba **Lutas** pública: todas as lutas do evento numa lista com busca (por
 * atleta ou academia) e filtro por tatame. Cada linha mostra horário, área,
 * categoria, os dois atletas e o resultado (W/L). Clicar abre o placar. O
 * `AutoRefresh` mantém a lista viva.
 */
export function LutasLista({
  itens,
  areas,
}: {
  itens: LutaItem[];
  areas: string[];
}) {
  const [busca, setBusca] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [lutaSel, setLutaSel] = useState<LutaSelecionada | null>(null);
  const dl = useDic().lutasTab;

  // modal aberto: trava o scroll do body e fecha com Esc
  useEffect(() => {
    if (!lutaSel) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLutaSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [lutaSel]);

  const q = norm(busca.trim());
  const filtradas = useMemo(() => {
    return itens.filter((it) => {
      if (area && it.area !== area) return false;
      if (!q) return true;
      const alvo = norm(
        `${it.luta.a1} ${it.luta.a2} ${it.academia1 ?? ""} ${it.academia2 ?? ""}`,
      );
      return alvo.includes(q);
    });
  }, [itens, area, q]);

  if (itens.length === 0) {
    return (
      <p className="font-cond text-sm uppercase tracking-[0.04em] text-muted-3">
        {dl.vazio}
      </p>
    );
  }

  return (
    <AbrirLutaCtx.Provider value={setLutaSel}>
      <AutoRefresh segundos={10} />

      {/* CONTROLES: busca + filtro de tatame */}
      <div className="mb-5 flex flex-col gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={dl.buscar}
          className="w-full border border-white/14 bg-background px-4 py-2.5 font-cond text-[15px] uppercase tracking-[0.02em] text-foreground placeholder:text-muted-3 focus:border-brand focus:outline-none"
        />
        {areas.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <ChipArea ativo={area === null} onClick={() => setArea(null)}>
              {dl.todas}
            </ChipArea>
            {areas.map((a) => (
              <ChipArea key={a} ativo={area === a} onClick={() => setArea(a)}>
                {a}
              </ChipArea>
            ))}
          </div>
        )}
      </div>

      <p className="mb-2 font-cond text-[12px] uppercase tracking-[0.05em] text-muted-3">
        <span className="tnum">{filtradas.length}</span>{" "}
        {filtradas.length === 1 ? dl.luta : dl.lutas}
        {area ? ` · ${area}` : ""}
        {q ? ` · "${busca.trim()}"` : ""}
      </p>

      {filtradas.length === 0 ? (
        <div className="border border-white/10 bg-surface px-6 py-12 text-center font-cond text-[14px] uppercase tracking-[0.04em] text-muted-3">
          {dl.nenhumaEncontrada}
        </div>
      ) : (
        <ul className="flex flex-col border border-white/10 bg-surface">
          {filtradas.map((it, i) => (
            <LinhaLutaLista key={`${it.luta.hora}-${it.area}-${i}`} item={it} />
          ))}
        </ul>
      )}

      <ModalPlacar sel={lutaSel} onFechar={() => setLutaSel(null)} />
    </AbrirLutaCtx.Provider>
  );
}

function ChipArea({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex -skew-x-9 items-center border px-3 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors",
        ativo
          ? "border-brand bg-brand text-white"
          : "border-white/14 text-muted-2 hover:border-brand/50 hover:text-brand-soft",
      )}
    >
      <span className="inline-block skew-x-9">{children}</span>
    </button>
  );
}

function LinhaLutaLista({ item }: { item: LutaItem }) {
  const { luta, area, catTitulo, catSubtitulo, academia1, academia2 } = item;
  const abrir = useContext(AbrirLutaCtx);
  return (
    <li className="border-b border-white/6 last:border-b-0">
      <button
        type="button"
        onClick={() =>
          abrir({ luta, catTitulo, catSubtitulo })
        }
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
      >
        {/* horário + área */}
        <div className="w-16 shrink-0">
          <div className="disp tnum text-[16px] leading-none">{luta.hora}</div>
          <div className="mt-1 truncate font-cond text-[10px] uppercase tracking-[0.05em] text-muted-3">
            {area}
          </div>
        </div>

        {/* categoria + atletas */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 -skew-x-9 border border-white/25"
              style={{ background: corDaFaixa(faixaDoTitulo(catTitulo)) }}
            />
            <span className="truncate font-cond text-[11px] uppercase tracking-[0.03em] text-muted-3">
              {catTitulo} · {catSubtitulo}
            </span>
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            <LinhaAtleta
              nome={luta.a1}
              academia={academia1}
              estado={estadoAtleta(luta, 1)}
            />
            <LinhaAtleta
              nome={luta.a2}
              academia={academia2}
              estado={estadoAtleta(luta, 2)}
            />
          </div>
        </div>

        {/* resultado */}
        <div className="flex shrink-0 flex-col gap-1">
          <ResultadoBox estado={estadoAtleta(luta, 1)} />
          <ResultadoBox estado={estadoAtleta(luta, 2)} />
        </div>
      </button>
    </li>
  );
}

function LinhaAtleta({
  nome,
  academia,
  estado,
}: {
  nome: string;
  academia: string | null;
  estado: ReturnType<typeof estadoAtleta>;
}) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <NomeAtleta nome={nome} estado={estado} />
      {academia && (
        <span className="truncate font-cond text-[11px] uppercase tracking-[0.02em] text-muted-3">
          {academia}
        </span>
      )}
    </span>
  );
}

/** cor da faixa a partir do título "Faixa · Peso" (primeiro segmento) */
function faixaDoTitulo(titulo: string): string | null {
  const faixa = titulo.split(" · ")[0]?.trim().toLowerCase();
  return faixa && faixa !== "—" ? faixa : null;
}
