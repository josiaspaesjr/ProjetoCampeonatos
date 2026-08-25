"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";

/** categoria enxuta para casar os filtros no cliente (contagem ao vivo) */
export interface CategoriaFiltro {
  id: string;
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  tipo: string;
}

/** dimensões presentes na grade (só o que existe aparece nos filtros) */
export interface DimensoesGrade {
  classes: { id: string; nome: string }[];
  sexos: string[];
  faixas: string[];
  temAbsoluto: boolean;
}

/** um dia distinto do evento */
export interface DiaDistinto {
  /** "YYYY-MM-DD" */
  data: string;
  /** "23/07" */
  label: string;
}

export interface FiltroState {
  classes: Set<string>;
  sexos: Set<string>;
  faixas: Set<string>;
  absoluto: boolean;
}

/** filtros zerados, um por dia */
export const filtrosVazios = (nDias: number): FiltroState[] =>
  Array.from({ length: nDias }, () => ({
    classes: new Set<string>(),
    sexos: new Set<string>(),
    faixas: new Set<string>(),
    absoluto: false,
  }));

/**
 * Contagem ao vivo + payload da action: cada categoria entra no PRIMEIRO dia
 * cujo filtro a inclui; o resto fica sem dia. Puro de propósito — o assistente
 * mostra os filtros num passo e o botão de estruturar em outro.
 */
export function resumoPorDia(
  dias: DiaDistinto[],
  filtros: FiltroState[],
  categorias: CategoriaFiltro[],
) {
  const usados = new Set<string>();
  const porDia = filtros.map((f) => {
    let n = 0;
    for (const c of categorias) {
      if (usados.has(c.id)) continue;
      if (casaFiltro(c, f)) {
        usados.add(c.id);
        n++;
      }
    }
    return n;
  });
  const atribuicoes = dias.map((d, di) => ({
    data: d.data,
    classes: [...(filtros[di]?.classes ?? [])],
    sexos: [...(filtros[di]?.sexos ?? [])],
    faixas: [...(filtros[di]?.faixas ?? [])],
    absoluto: filtros[di]?.absoluto ?? false,
  }));
  return {
    porDia,
    naoAtribuidas: categorias.length - usados.size,
    atribuidas: usados.size,
    atribuicoes,
  };
}

const chipBase =
  "border font-cond font-semibold uppercase tracking-[0.04em] transition-colors";
const chipAtivo = "border-brand bg-brand text-white";
const chipInativo = "border-white/14 text-text-2 hover:border-white/30";

function casaFiltro(c: CategoriaFiltro, f: FiltroState): boolean {
  if (!f.classes.has(c.classeIdade)) return false;
  if (!f.sexos.has(c.sexo)) return false;
  if (c.faixa && !f.faixas.has(c.faixa)) return false;
  if (c.tipo === "absoluto" && !f.absoluto) return false;
  return true;
}

/**
 * Modo "Por dia": para cada dia do evento, o organizador escolhe classe·sexo·
 * faixa (+ absoluto) e as categorias que casam são fixadas naquele dia. Mostra
 * a contagem ao vivo por dia e quantas ficam sem dia. Ao estruturar, envia
 * `atribuicoes` (JSON) + `numAreas` para a action `estruturarPorDia`.
 */
export function PainelPorDia({
  dias,
  dimensoes,
  categorias,
  filtros,
  setFiltros,
}: {
  dias: DiaDistinto[];
  dimensoes: DimensoesGrade;
  categorias: CategoriaFiltro[];
  /** filtros por dia (estado no pai: o assistente separa filtros e ação) */
  filtros: FiltroState[];
  setFiltros: React.Dispatch<React.SetStateAction<FiltroState[]>>;
}) {
  const dic = useDic();
  const ta = dic.admin.areas;
  const ger = dic.admin.gerador;

  function toggle(
    di: number,
    dim: "classes" | "sexos" | "faixas",
    valor: string,
  ) {
    setFiltros((fs) =>
      fs.map((f, k) => {
        if (k !== di) return f;
        const proximo = new Set(f[dim]);
        if (proximo.has(valor)) proximo.delete(valor);
        else proximo.add(valor);
        return { ...f, [dim]: proximo };
      }),
    );
  }

  function toggleAbsoluto(di: number) {
    setFiltros((fs) =>
      fs.map((f, k) => (k === di ? { ...f, absoluto: !f.absoluto } : f)),
    );
  }

  // contagem ao vivo (mesmo cálculo que a action recebe ao estruturar)
  const contagem = useMemo(
    () => resumoPorDia(dias, filtros, categorias),
    [dias, filtros, categorias],
  );

  const nomeSexo = (s: string) =>
    s === "masculino" ? dic.inscricao.masculino : dic.inscricao.feminino;
  const nomeFaixa = (f: string) =>
    dic.evento.faixaNomes[f as keyof typeof dic.evento.faixaNomes] ??
    f.charAt(0).toUpperCase() + f.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl font-cond text-[13px] uppercase tracking-[0.02em] text-muted-3">
        {ta.porDiaTexto}
      </p>

      {/* um cartão por dia */}
      <div className="flex flex-col gap-3">
        {dias.map((d, di) => (
          <div
            key={d.data}
            className="border border-white/10 bg-background p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
                  {dic.placar.dia} {di + 1}
                </span>
                <span className="disp text-[18px]">{d.label}</span>
              </div>
              <span className="font-cond text-[13px] uppercase tracking-[0.04em] text-brand">
                <span className="disp tnum text-[18px]">
                  {contagem.porDia[di]}
                </span>{" "}
                {contagem.porDia[di] === 1
                  ? dic.admin.categorias.categoria
                  : dic.admin.categorias.categorias}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* CLASSES */}
              <Linha titulo={ger.classes}>
                {dimensoes.classes.map((c) => (
                  <Chip
                    key={c.id}
                    ativo={filtros[di].classes.has(c.id)}
                    onClick={() => toggle(di, "classes", c.id)}
                    skew
                  >
                    {dic.classesIdade[c.id] ?? c.nome}
                  </Chip>
                ))}
              </Linha>

              {/* SEXO */}
              <Linha titulo={ger.sexo}>
                {dimensoes.sexos.map((s) => (
                  <Chip
                    key={s}
                    ativo={filtros[di].sexos.has(s)}
                    onClick={() => toggle(di, "sexos", s)}
                  >
                    {nomeSexo(s)}
                  </Chip>
                ))}
                {dimensoes.temAbsoluto && (
                  <Chip
                    ativo={filtros[di].absoluto}
                    onClick={() => toggleAbsoluto(di)}
                  >
                    {ger.incluirAbsoluto}
                  </Chip>
                )}
              </Linha>

              {/* FAIXAS */}
              <Linha titulo={ger.faixas}>
                {dimensoes.faixas.map((f) => (
                  <Chip
                    key={f}
                    ativo={filtros[di].faixas.has(f)}
                    onClick={() => toggle(di, "faixas", f)}
                  >
                    <span
                      className="h-3 w-3 shrink-0 border border-white/25"
                      style={{ background: corDaFaixa(f) }}
                    />
                    {nomeFaixa(f)}
                  </Chip>
                ))}
              </Linha>
            </div>
          </div>
        ))}
      </div>

      {/* quantas ficaram sem dia (o botão de estruturar é o passo seguinte) */}
      <p className="font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
        {contagem.naoAtribuidas > 0 ? (
          <>
            <span className="disp tnum text-brand">
              {contagem.naoAtribuidas}
            </span>{" "}
            {ta.porDiaSemDia}
          </>
        ) : (
          ta.porDiaTodasAtribuidas
        )}
      </p>
    </div>
  );
}

/** botão Mostrar/Ocultar do cabeçalho das seções recolhíveis */
export function BotaoRecolher({
  aberto,
  onClick,
  ta,
}: {
  aberto: boolean;
  onClick: () => void;
  ta: { secaoMostrar: string; secaoOcultar: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      className="inline-flex -skew-x-9 items-center border border-white/14 px-3 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
    >
      <span className="inline-flex skew-x-9 items-center gap-1.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="square"
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            aberto && "rotate-90",
          )}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        {aberto ? ta.secaoOcultar : ta.secaoMostrar}
      </span>
    </button>
  );
}

function Linha({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 font-cond text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-3">
        {titulo}
      </span>
      {children}
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
  skew,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  skew?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        chipBase,
        "flex items-center gap-2 px-3 py-2 text-[13px]",
        skew && "-skew-x-9",
        ativo ? chipAtivo : chipInativo,
      )}
    >
      <span className={cn("flex items-center gap-2", skew && "skew-x-9")}>
        {children}
      </span>
    </button>
  );
}
