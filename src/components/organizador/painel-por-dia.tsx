"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
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

interface FiltroState {
  classes: Set<string>;
  sexos: Set<string>;
  faixas: Set<string>;
  absoluto: boolean;
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
  areasN,
  setAreasN,
  estruturar,
}: {
  dias: DiaDistinto[];
  dimensoes: DimensoesGrade;
  categorias: CategoriaFiltro[];
  /** nº de áreas (string do input, compartilhado com o modo automático) */
  areasN: string;
  setAreasN: (v: string) => void;
  estruturar: (formData: FormData) => void | Promise<void>;
}) {
  const dic = useDic();
  const ta = dic.admin.areas;
  const ger = dic.admin.gerador;

  const nInt = Math.floor(Number(areasN));
  const nAreasValido = Number.isFinite(nInt) && nInt >= 1 && nInt <= 40;

  const [filtros, setFiltros] = useState<FiltroState[]>(() =>
    dias.map(() => ({
      classes: new Set<string>(),
      sexos: new Set<string>(),
      faixas: new Set<string>(),
      absoluto: false,
    })),
  );

  function toggle(di: number, dim: "classes" | "sexos" | "faixas", valor: string) {
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

  // contagem ao vivo: cada categoria vai para o 1º dia cujo filtro a inclui
  const contagem = useMemo(() => {
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
    return { porDia, naoAtribuidas: categorias.length - usados.size };
  }, [filtros, categorias]);

  const totalAtribuidas = categorias.length - contagem.naoAtribuidas;
  const podeEstruturar = nAreasValido && totalAtribuidas > 0;

  const atribuicoes = dias.map((d, di) => ({
    data: d.data,
    classes: [...filtros[di].classes],
    sexos: [...filtros[di].sexos],
    faixas: [...filtros[di].faixas],
    absoluto: filtros[di].absoluto,
  }));

  const nomeSexo = (s: string) =>
    s === "masculino" ? dic.inscricao.masculino : dic.inscricao.feminino;
  const nomeFaixa = (f: string) =>
    dic.evento.faixaNomes[f as keyof typeof dic.evento.faixaNomes] ??
    f.charAt(0).toUpperCase() + f.slice(1);

  return (
    <div className="relative flex flex-col gap-4 border border-white/10 bg-surface p-[22px]">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="disp text-[22px]">{ta.porDiaTitulo}</div>
          <p className="mt-1 max-w-xl font-cond text-[13px] uppercase tracking-[0.02em] text-muted-3">
            {ta.porDiaTexto}
          </p>
        </div>
        <div>
          <label
            htmlFor="num-areas-dia"
            className="mb-1.5 block font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3"
          >
            {ta.numeroAreas}
          </label>
          <input
            id="num-areas-dia"
            type="number"
            min={1}
            max={40}
            value={areasN}
            onChange={(e) => setAreasN(e.target.value)}
            placeholder="0"
            className="disp tnum w-[92px] border border-white/14 bg-background px-3 py-1 text-[40px] leading-none text-foreground focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* um cartão por dia */}
      <div className="flex flex-col gap-3">
        {dias.map((d, di) => (
          <div key={d.data} className="border border-white/10 bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
                  {dic.placar.dia} {di + 1}
                </span>
                <span className="disp text-[18px]">{d.label}</span>
              </div>
              <span className="font-cond text-[13px] uppercase tracking-[0.04em] text-brand">
                <span className="disp tnum text-[18px]">{contagem.porDia[di]}</span>{" "}
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

      {/* rodapé: não atribuídas + estruturar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="font-cond text-[13px] uppercase tracking-[0.04em] text-muted-3">
          {contagem.naoAtribuidas > 0 ? (
            <>
              <span className="disp tnum text-brand">{contagem.naoAtribuidas}</span>{" "}
              {ta.porDiaSemDia}
            </>
          ) : (
            ta.porDiaTodasAtribuidas
          )}
        </span>

        <form action={estruturar}>
          <input type="hidden" name="numAreas" value={nAreasValido ? nInt : ""} />
          <input
            type="hidden"
            name="atribuicoes"
            value={JSON.stringify(atribuicoes)}
          />
          <BotaoAcaoBruto
            disabled={!podeEstruturar}
            className="inline-flex -skew-x-9 items-center bg-brand px-6 py-3.5 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="inline-block skew-x-9">⚙ {ta.estruturarPorDia}</span>
          </BotaoAcaoBruto>
        </form>
      </div>
    </div>
  );
}

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
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
