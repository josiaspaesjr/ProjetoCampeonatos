"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import {
  CLASSES_IDADE,
  FAIXAS,
  tabelaPesos,
  type Faixa,
  type Sexo,
} from "@/lib/categorias/cbjj";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Preset {
  chave: string;
  classes: string[];
  sexos: Sexo[];
  faixas: Faixa[];
  absoluto: boolean;
}

const FAIXAS_ADULTO: Faixa[] = ["branca", "azul", "roxa", "marrom", "preta"];
const MASTERS = CLASSES_IDADE.filter((c) => c.id.startsWith("master")).map((c) => c.id);

const PRESETS: Preset[] = [
  {
    chave: "adultoCompleto",
    classes: ["adulto"],
    sexos: ["masculino", "feminino"],
    faixas: FAIXAS_ADULTO,
    absoluto: false,
  },
  {
    chave: "kids",
    classes: ["pre_mirim", "mirim", "infantil", "infanto_juvenil"],
    sexos: ["masculino", "feminino"],
    faixas: ["branca", "cinza", "amarela", "laranja", "verde"],
    absoluto: false,
  },
  {
    chave: "master",
    classes: MASTERS,
    sexos: ["masculino", "feminino"],
    faixas: FAIXAS_ADULTO,
    absoluto: false,
  },
  {
    chave: "soPreta",
    classes: ["adulto", ...MASTERS],
    sexos: ["masculino", "feminino"],
    faixas: ["preta"],
    absoluto: false,
  },
];

const chipBase =
  "border font-cond font-semibold uppercase tracking-[0.04em] transition-colors";
const chipAtivo = "border-brand bg-brand text-white";
const chipInativo = "border-white/14 text-text-2 hover:border-white/30";
const miniAcao =
  "font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground";

export function GeradorGrade({
  gerar,
}: {
  gerar: (formData: FormData) => void | Promise<void>;
}) {
  // abre já na seleção mais comum (adulto, ambos os sexos, branca + azul)
  const [classes, setClasses] = useState<Set<string>>(new Set(["adulto"]));
  const [sexos, setSexos] = useState<Set<Sexo>>(
    new Set<Sexo>(["masculino", "feminino"]),
  );
  const [faixas, setFaixas] = useState<Set<Faixa>>(
    new Set<Faixa>(["branca", "azul"]),
  );
  const [absoluto, setAbsoluto] = useState(false);
  const d = useDic();
  const ger = d.admin.gerador;

  function toggle<T>(set: Set<T>, valor: T): Set<T> {
    const proximo = new Set(set);
    if (proximo.has(valor)) proximo.delete(valor);
    else proximo.add(valor);
    return proximo;
  }

  function aplicarPreset(p: Preset) {
    setClasses(new Set(p.classes));
    setSexos(new Set(p.sexos));
    setFaixas(new Set(p.faixas));
    setAbsoluto(p.absoluto);
  }

  function limparTudo() {
    setClasses(new Set());
    setSexos(new Set());
    setFaixas(new Set());
    setAbsoluto(false);
  }

  // conta pesos e total respeitando as faixas permitidas por classe (como o gerador)
  const resumo = useMemo(() => {
    const contagensPeso: number[] = [];
    let total = 0;
    for (const classeId of classes) {
      const classe = CLASSES_IDADE.find((c) => c.id === classeId);
      if (!classe) continue;
      const faixasValidas = [...faixas].filter((f) => classe.faixas.includes(f));
      for (const sexo of sexos) {
        const nPesos = tabelaPesos(classeId, sexo).length;
        contagensPeso.push(nPesos);
        total += faixasValidas.length * (nPesos + (absoluto ? 1 : 0));
      }
    }
    const min = contagensPeso.length ? Math.min(...contagensPeso) : 0;
    const max = contagensPeso.length ? Math.max(...contagensPeso) : 0;
    return {
      classes: classes.size,
      sexos: sexos.size,
      faixas: faixas.size,
      pesos: min === max ? String(min) : `${min}–${max}`,
      total,
    };
  }, [classes, sexos, faixas, absoluto]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* SELEÇÃO */}
      <div className="flex flex-col gap-5">
        {/* PRESETS */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
              {ger.presetsLabel}
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.chave}
                type="button"
                onClick={() => aplicarPreset(p)}
                className="border border-white/16 px-3.5 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground"
              >
                {ger.presets[p.chave] ?? p.chave}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={limparTudo}
            className="border border-brand/50 px-3.5 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-brand transition-colors hover:bg-brand/10"
          >
            {ger.limparTudo}
          </button>
        </div>

        {/* CLASSES */}
        <div className="border border-white/10 bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-cond text-lg font-bold uppercase tracking-[0.04em]">
                {ger.classes}
              </span>
              <span className="font-cond text-[13px] uppercase tracking-[0.06em] text-brand">
                {resumo.classes}{" "}
                {resumo.classes === 1 ? ger.selecionada : ger.selecionadas}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className={miniAcao}
                onClick={() => setClasses(new Set(CLASSES_IDADE.map((c) => c.id)))}
              >
                {ger.tudo}
              </button>
              <button
                type="button"
                className={miniAcao}
                onClick={() => setClasses(new Set())}
              >
                {ger.nenhuma}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CLASSES_IDADE.map((c) => {
              const ativo = classes.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClasses((s) => toggle(s, c.id))}
                  className={cn(
                    chipBase,
                    "-skew-x-9 px-4 py-2.5 text-sm",
                    ativo ? chipAtivo : chipInativo,
                  )}
                >
                  <span className="inline-block skew-x-9">
                    {d.classesIdade[c.id] ?? c.nome}{" "}
                    <span className={ativo ? "text-white/70" : "text-muted-3"}>
                      ({c.idadeMin}
                      {c.idadeMax ? `-${c.idadeMax}` : "+"})
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* SEXO */}
          <div className="border border-white/10 bg-surface p-5">
            <div className="mb-4 font-cond text-lg font-bold uppercase tracking-[0.04em]">
              {ger.sexo}
            </div>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  [d.inscricao.masculino, () => setSexos((s) => toggle(s, "masculino")), sexos.has("masculino")],
                  [d.inscricao.feminino, () => setSexos((s) => toggle(s, "feminino")), sexos.has("feminino")],
                  [ger.incluirAbsoluto, () => setAbsoluto((v) => !v), absoluto],
                ] as [string, () => void, boolean][]
              ).map(([rotulo, onClick, ativo]) => (
                <button
                  key={rotulo}
                  type="button"
                  onClick={onClick}
                  className={cn(
                    "flex items-center gap-3 border px-4 py-3 text-left font-cond text-[15px] font-semibold uppercase tracking-[0.03em] transition-colors",
                    ativo ? chipAtivo : chipInativo,
                  )}
                >
                  <span
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 border",
                      ativo ? "border-white bg-white" : "border-white/30",
                    )}
                  />
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          {/* FAIXAS */}
          <div className="border border-white/10 bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="font-cond text-lg font-bold uppercase tracking-[0.04em]">
                {ger.faixas}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={miniAcao}
                  onClick={() => setFaixas(new Set(FAIXAS))}
                >
                  {ger.tudo}
                </button>
                <button
                  type="button"
                  className={miniAcao}
                  onClick={() => setFaixas(new Set())}
                >
                  {ger.nenhuma}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {FAIXAS.map((f) => {
                const ativo = faixas.has(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFaixas((s) => toggle(s, f))}
                    className={cn(
                      chipBase,
                      "flex items-center gap-2 px-3.5 py-2.5 text-sm",
                      ativo ? chipAtivo : chipInativo,
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 border border-white/25"
                      style={{ background: corDaFaixa(f) }}
                    />
                    {d.evento.faixaNomes[
                      f as keyof typeof d.evento.faixaNomes
                    ] ?? cap(f)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PRÉ-VISUALIZAÇÃO */}
      <aside className="h-fit lg:sticky lg:top-4">
        <div className="border border-brand/50 bg-surface p-6">
          <div className="mb-5 font-cond text-[13px] font-semibold uppercase tracking-[0.12em] text-brand">
            {ger.previa}
          </div>

          <div className="flex flex-col gap-2.5 font-cond text-[15px] uppercase tracking-[0.04em]">
            {(
              [
                [ger.classes, resumo.classes],
                [`× ${ger.sexos}`, resumo.sexos],
                [`× ${ger.faixas}`, resumo.faixas],
                [`× ${ger.pesos}`, resumo.pesos],
              ] as [string, number | string][]
            ).map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4">
                <span className="text-text-2">{rotulo}</span>
                <span className="disp text-2xl tabular-nums">{valor}</span>
              </div>
            ))}
          </div>

          <div className="my-5 border-t border-white/10" />

          <div className="font-cond text-[13px] uppercase tracking-[0.1em] text-muted-2">
            {ger.totalCategorias}
          </div>
          <div className="disp leading-none text-brand text-[clamp(56px,8vw,76px)]">
            {resumo.total}
          </div>
          <div className="mb-5 mt-1 font-cond text-[13px] uppercase tracking-[0.08em] text-muted-3">
            {ger.prontasGerar}
          </div>

          <form action={gerar}>
            {[...classes].map((c) => (
              <input key={c} type="hidden" name="classes" value={c} />
            ))}
            {[...sexos].map((s) => (
              <input key={s} type="hidden" name="sexos" value={s} />
            ))}
            {[...faixas].map((f) => (
              <input key={f} type="hidden" name="faixas" value={f} />
            ))}
            {absoluto && <input type="hidden" name="incluirAbsoluto" value="on" />}
            <BotaoAcaoBruto
              disabled={resumo.total === 0}
              className="flex w-full items-center justify-center bg-brand py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resumo.total > 0
                ? `${ger.gerarPre} ${resumo.total} ${d.admin.categorias.categorias}`
                : ger.selecioneGrade}
            </BotaoAcaoBruto>
          </form>

          <p className="mt-3 text-center font-cond text-[12px] uppercase tracking-[0.06em] text-muted-3">
            {ger.somaGrade}
          </p>
        </div>
      </aside>
    </div>
  );
}
