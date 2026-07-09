"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CLASSES_IDADE } from "@/lib/categorias/cbjj";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { cn } from "@/lib/utils";

export interface CategoriaLinha {
  id: string;
  nome: string;
  faixa: string | null;
  classeIdade: string;
  sexo: string;
  inscritos: number;
  chaveUrl: string | null;
  /** preço próprio formatado (entry); nulo = preço do lote */
  preco: string | null;
}

export function CategoriasFiltro({ categorias }: { categorias: CategoriaLinha[] }) {
  const [filtro, setFiltro] = useState("todas");

  const chips = useMemo(() => {
    const presentes = new Set(categorias.map((c) => c.classeIdade));
    const classes = CLASSES_IDADE.filter((cl) => presentes.has(cl.id)).map(
      (cl) => ({ id: cl.id, rotulo: cl.nome }),
    );
    const temFeminino = categorias.some((c) => c.sexo === "feminino");
    return [
      { id: "todas", rotulo: "Todas" },
      ...classes,
      ...(temFeminino ? [{ id: "feminino", rotulo: "Feminino" }] : []),
    ];
  }, [categorias]);

  const visiveis = categorias.filter((c) => {
    if (filtro === "todas") return true;
    if (filtro === "feminino") return c.sexo === "feminino";
    return c.classeIdade === filtro;
  });

  const rotuloFiltro =
    chips.find((c) => c.id === filtro)?.rotulo.toLowerCase() ?? "todas";

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const ativo = filtro === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFiltro(chip.id)}
              className={cn(
                "px-4 py-[9px] font-display text-[13px] font-bold uppercase tracking-[0.06em] transition-colors",
                ativo
                  ? "border border-gold bg-gold text-ink"
                  : "border border-white/16 text-muted-2 hover:text-foreground",
              )}
            >
              {chip.rotulo}
            </button>
          );
        })}
      </div>

      <div className="border border-white/9">
        {visiveis.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "flex items-center justify-between gap-4 border-b border-white/6 px-5 py-[15px] last:border-b-0",
              i % 2 === 1 && "bg-white/[0.015]",
            )}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                className="h-2 w-2 shrink-0 rotate-45"
                style={{ background: corDaFaixa(c.faixa) }}
              />
              <span className="truncate font-display text-lg font-semibold uppercase tracking-[0.02em]">
                {c.nome}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-4 font-mono text-xs">
              {c.preco && <span className="text-gold-light">{c.preco}</span>}
              <span className={c.inscritos > 0 ? "text-muted-2" : "text-muted-3"}>
                {c.inscritos} inscrito{c.inscritos === 1 ? "" : "s"}
              </span>
              {c.chaveUrl && (
                <Link
                  href={c.chaveUrl}
                  className="uppercase tracking-[0.08em] text-gold transition-colors hover:text-gold-light"
                >
                  Chave →
                </Link>
              )}
            </div>
          </div>
        ))}
        {visiveis.length === 0 && (
          <div className="px-5 py-8 font-mono text-sm text-muted-3">
            Nenhuma categoria neste filtro.
          </div>
        )}
      </div>
      <div className="mt-3.5 font-mono text-xs text-muted-3">
        Mostrando {rotuloFiltro} · as categorias compatíveis com seu perfil
        aparecem na tela de inscrição
      </div>
    </div>
  );
}
