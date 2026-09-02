"use client";

import { useState } from "react";
import { BlocosHorario } from "@/components/cronograma/blocos-horario";
import { LutasLista, type LutaItem } from "@/components/evento/lutas-lista";
import type { BlocoHorario } from "@/lib/cronograma/blocos";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Aba = "blocos" | "lutas";

/**
 * As duas leituras do cronograma, em abas.
 *
 * "Ordem das lutas" abre primeiro: é a sequência dentro do tatame, para quem
 * está acompanhando o evento. "Horário por divisão" diz quando cada faixa
 * entra. Separadas porque respondem a perguntas diferentes; juntas, uma
 * empurrava a outra para fora da tela.
 */
export function CronogramaAbas({
  blocos,
  itens,
  areas,
  multiDia,
}: {
  blocos: BlocoHorario[];
  itens: LutaItem[];
  areas: string[];
  multiDia: boolean;
}) {
  const db = useDic().blocosHorario;
  const [aba, setAba] = useState<Aba>("lutas");

  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: "lutas", rotulo: db.abaLutas, n: itens.length },
    { id: "blocos", rotulo: db.abaBlocos, n: blocos.length },
  ];

  return (
    <>
      <div
        role="tablist"
        className="mb-6 flex gap-1 border-b border-white/8"
      >
        {abas.map((a) => {
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={ativo}
              onClick={() => setAba(a.id)}
              className={cn(
                "relative shrink-0 cursor-pointer px-4 py-3 font-cond text-[15px] font-semibold uppercase tracking-[0.06em] transition-colors",
                ativo ? "text-foreground" : "text-muted-2 hover:text-text-2",
              )}
            >
              <span className="flex items-center gap-1.5">
                {a.rotulo}
                {a.n > 0 && (
                  <span
                    className={cn(
                      "font-cond text-[11px] tabular-nums",
                      ativo ? "text-brand" : "text-muted-3",
                    )}
                  >
                    {a.n}
                  </span>
                )}
              </span>
              {ativo && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] -skew-x-12 bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      {aba === "blocos" ? (
        <BlocosHorario blocos={blocos} multiDia={multiDia} />
      ) : (
        <LutasLista itens={itens} areas={areas} multiDia={multiDia} />
      )}
    </>
  );
}
