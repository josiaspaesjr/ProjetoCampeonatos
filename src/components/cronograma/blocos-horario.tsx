"use client";

import type { BlocoHorario } from "@/lib/cronograma/blocos";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Horário de entrada por divisão (idade · sexo · faixa).
 *
 * É o único horário que a plataforma publica. O tempo estimado de cada luta
 * continua existindo — ele distribui as lutas entre os tatames —, mas não vai
 * para a tela: num evento real a estimativa por luta erra por muito e vira
 * promessa quebrada. Já "sua faixa entra às 10h" se sustenta.
 */
export function BlocosHorario({
  blocos,
  multiDia,
  className,
}: {
  blocos: BlocoHorario[];
  /** evento com mais de um dia: aí a data precisa aparecer em cada bloco */
  multiDia?: boolean;
  className?: string;
}) {
  const db = useDic().blocosHorario;

  if (blocos.length === 0) {
    return (
      <p
        className={cn(
          "border border-dashed border-white/12 px-5 py-8 text-center font-cond text-sm uppercase tracking-[0.05em] text-muted-3",
          className,
        )}
      >
        {db.vazio}
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="mb-4 max-w-[560px] text-sm leading-normal text-muted-2">
        {db.desc}
      </p>
      <ul className="border border-white/10">
        {blocos.map((b, i) => (
          <li
            key={b.chave}
            className={cn(
              "flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-white/6 px-5 py-3.5 last:border-b-0",
              i % 2 === 1 && "bg-white/[0.015]",
            )}
          >
            <div className="min-w-0">
              <span className="font-cond text-[18px] font-semibold uppercase tracking-[0.02em]">
                {b.rotulo}
              </span>
              {b.areas.length > 0 && (
                <span className="ml-2.5 font-cond text-[13px] uppercase tracking-[0.05em] text-muted-3">
                  {b.areas.length === 1 ? db.tatame : db.tatames}{" "}
                  {b.areas.join(" · ")}
                </span>
              )}
            </div>
            <span className="disp tnum shrink-0 text-[22px] leading-none text-brand-soft">
              {multiDia && (
                <span className="mr-2 font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
                  {b.dataLabel}
                </span>
              )}
              {b.hora}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
