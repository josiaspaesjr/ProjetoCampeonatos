"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDic } from "@/lib/i18n/client";

/** um dia do evento no formulário */
export interface DiaEvento {
  /** "YYYY-MM-DD" */
  data: string;
  /** "HH:MM" */
  inicio: string;
  /** "HH:MM" */
  fim: string;
}

/** próximo dia (YYYY-MM-DD) — sugestão ao adicionar uma linha */
function proximaData(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Lista dinâmica de dias do evento (data + início + fim). Compartilhada entre o
 * cadastro/edição do evento e a tela de Áreas. Emite arrays paralelos
 * `diaData[]`, `diaInicio[]`, `diaFim[]` no FormData (mesmo padrão dos pacotes
 * de preço dos lotes). Como fica dentro do <form>, remonta com ele e o estado
 * volta ao default.
 */
export function CamposDiasEvento({
  labelCls,
  inputClassName,
  defaultDias,
}: {
  labelCls: string;
  inputClassName?: string;
  defaultDias?: DiaEvento[];
}) {
  const dc = useDic().admin.campos;
  const [dias, setDias] = useState<DiaEvento[]>(
    defaultDias && defaultDias.length
      ? defaultDias
      : [{ data: "", inicio: "09:00", fim: "18:00" }],
  );

  const atualizar = (i: number, campo: keyof DiaEvento, valor: string) =>
    setDias((ds) => ds.map((d, k) => (k === i ? { ...d, [campo]: valor } : d)));

  const adicionar = () =>
    setDias((ds) => {
      const ultima = ds[ds.length - 1];
      return [
        ...ds,
        {
          data: ultima?.data ? proximaData(ultima.data) : "",
          inicio: ultima?.inicio ?? "09:00",
          fim: ultima?.fim ?? "18:00",
        },
      ];
    });

  const remover = (i: number) =>
    setDias((ds) => (ds.length > 1 ? ds.filter((_, k) => k !== i) : ds));

  const subLabel =
    "font-cond text-[11px] uppercase tracking-[0.06em] text-muted-3";

  return (
    <div className="flex flex-col gap-2.5">
      <label className={labelCls}>{dc.diasEvento}</label>
      {dias.map((d, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {i === 0 && <span className={subLabel}>{dc.diaData}</span>}
            <Input
              type="date"
              name="diaData"
              required
              value={d.data}
              onChange={(e) => atualizar(i, "data", e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            {i === 0 && <span className={subLabel}>{dc.horaInicio}</span>}
            <Input
              type="time"
              name="diaInicio"
              required
              value={d.inicio}
              onChange={(e) => atualizar(i, "inicio", e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            {i === 0 && <span className={subLabel}>{dc.horaFim}</span>}
            <Input
              type="time"
              name="diaFim"
              required
              value={d.fim}
              onChange={(e) => atualizar(i, "fim", e.target.value)}
              className={inputClassName}
            />
          </div>
          <button
            type="button"
            onClick={() => remover(i)}
            disabled={dias.length === 1}
            aria-label={dc.removerDia}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-white/16 text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft disabled:cursor-not-allowed disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={adicionar}
          className="inline-flex -skew-x-9 items-center border border-white/16 px-3 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
        >
          <span className="inline-block skew-x-9">{dc.adicionarDia}</span>
        </button>
        <p className="max-w-[420px] text-[13px] font-medium text-muted-3">
          {dc.diasNota}
        </p>
      </div>
    </div>
  );
}
