"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDic } from "@/lib/i18n/client";

/** um dia do evento no formulário (achatado: uma janela = data + início + fim) */
export interface DiaEvento {
  /** "YYYY-MM-DD" */
  data: string;
  /** "HH:MM" */
  inicio: string;
  /** "HH:MM" */
  fim: string;
}

/** um turno (janela de horário) dentro de um dia */
interface Turno {
  inicio: string;
  fim: string;
}

/** um dia com um ou mais turnos (manhã/tarde) */
interface DiaGrupo {
  data: string;
  turnos: Turno[];
}

/** próximo dia (YYYY-MM-DD) — sugestão ao adicionar um dia */
function proximaData(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" → minutos desde a meia-noite (entrada inválida → 0) */
function hhmmMin(s: string): number {
  const [h, m] = String(s).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** minutos desde a meia-noite → "HH:MM" (clampado em 00:00–23:59) */
function minHhmm(min: number): string {
  const c = Math.max(0, Math.min(min, 23 * 60 + 59));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

/** turno sugerido ao adicionar: 2h de intervalo após o fim do último, +3h de duração */
function proximoTurno(turnos: Turno[]): Turno {
  const ult = turnos[turnos.length - 1];
  const inicio = Math.min((ult ? hhmmMin(ult.fim) : 14 * 60) + 120, 22 * 60);
  return { inicio: minHhmm(inicio), fim: minHhmm(inicio + 180) };
}

/** achata os grupos (dia → turnos) em uma linha por turno para o FormData */
function agrupar(dias: DiaEvento[]): DiaGrupo[] {
  const grupos: DiaGrupo[] = [];
  for (const d of dias) {
    const g = grupos.find((g) => g.data === d.data);
    if (g) g.turnos.push({ inicio: d.inicio, fim: d.fim });
    else grupos.push({ data: d.data, turnos: [{ inicio: d.inicio, fim: d.fim }] });
  }
  return grupos;
}

/**
 * Lista dinâmica de dias do evento. Cada **dia** tem uma data e um ou mais
 * **turnos** (janelas de horário) — o intervalo entre turnos fica livre de
 * lutas. Compartilhada entre o cadastro/edição do evento e a tela de Áreas.
 *
 * Emite arrays paralelos `diaData[]`, `diaInicio[]`, `diaFim[]` no FormData (uma
 * entrada por turno; a data se repete nos turnos do mesmo dia) — o mesmo padrão
 * dos pacotes de preço dos lotes. Como fica dentro do <form>, remonta com ele e
 * o estado volta ao default.
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
  const [dias, setDias] = useState<DiaGrupo[]>(
    defaultDias && defaultDias.length
      ? agrupar(defaultDias)
      : [{ data: "", turnos: [{ inicio: "09:00", fim: "18:00" }] }],
  );

  const setData = (gi: number, data: string) =>
    setDias((ds) => ds.map((g, k) => (k === gi ? { ...g, data } : g)));

  const setTurno = (gi: number, ti: number, campo: keyof Turno, valor: string) =>
    setDias((ds) =>
      ds.map((g, k) =>
        k === gi
          ? {
              ...g,
              turnos: g.turnos.map((t, j) =>
                j === ti ? { ...t, [campo]: valor } : t,
              ),
            }
          : g,
      ),
    );

  const addDia = () =>
    setDias((ds) => {
      const ult = ds[ds.length - 1];
      return [
        ...ds,
        {
          data: ult?.data ? proximaData(ult.data) : "",
          turnos: [{ inicio: "09:00", fim: "18:00" }],
        },
      ];
    });

  const addTurno = (gi: number) =>
    setDias((ds) =>
      ds.map((g, k) =>
        k === gi ? { ...g, turnos: [...g.turnos, proximoTurno(g.turnos)] } : g,
      ),
    );

  const removeDia = (gi: number) =>
    setDias((ds) => (ds.length > 1 ? ds.filter((_, k) => k !== gi) : ds));

  const removeTurno = (gi: number, ti: number) =>
    setDias((ds) =>
      ds.map((g, k) =>
        k === gi ? { ...g, turnos: g.turnos.filter((_, j) => j !== ti) } : g,
      ),
    );

  const subLabel =
    "font-cond text-[11px] uppercase tracking-[0.06em] text-muted-3";
  const btnRemover =
    "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-white/16 text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex flex-col gap-2.5">
      <label className={labelCls}>{dc.diasEvento}</label>

      {dias.map((g, gi) => (
        <div
          key={gi}
          className="flex flex-col gap-2 border border-white/8 bg-white/[0.015] p-3"
        >
          {g.turnos.map((t, ti) => (
            <div key={ti}>
              {/* dica do intervalo livre entre um turno e o seguinte */}
              {ti > 0 && (
                <div className="mb-1.5 flex items-center gap-2 pl-1 font-cond text-[10px] uppercase tracking-[0.06em] text-muted-3">
                  <span className="h-px flex-1 bg-white/8" />
                  {dc.intervaloLivre} {g.turnos[ti - 1].fim} → {t.inicio}
                  <span className="h-px flex-1 bg-white/8" />
                </div>
              )}
              <div className="flex items-end gap-2">
                {/* 1º turno traz a DATA do dia; os demais herdam (hidden) */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {gi === 0 && ti === 0 && (
                    <span className={subLabel}>{dc.diaData}</span>
                  )}
                  {ti === 0 ? (
                    <Input
                      type="date"
                      name="diaData"
                      required
                      value={g.data}
                      onChange={(e) => setData(gi, e.target.value)}
                      className={inputClassName}
                    />
                  ) : (
                    <div className="flex h-11 items-center gap-2 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                      <input type="hidden" name="diaData" value={g.data} />
                      <span className="-skew-x-9 border border-white/12 px-2 py-0.5">
                        <span className="inline-block skew-x-9">
                          {dc.turno} {ti + 1}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {gi === 0 && ti === 0 && (
                    <span className={subLabel}>{dc.horaInicio}</span>
                  )}
                  <Input
                    type="time"
                    name="diaInicio"
                    required
                    value={t.inicio}
                    onChange={(e) => setTurno(gi, ti, "inicio", e.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  {gi === 0 && ti === 0 && (
                    <span className={subLabel}>{dc.horaFim}</span>
                  )}
                  <Input
                    type="time"
                    name="diaFim"
                    required
                    value={t.fim}
                    onChange={(e) => setTurno(gi, ti, "fim", e.target.value)}
                    className={inputClassName}
                  />
                </div>

                {ti === 0 ? (
                  <button
                    type="button"
                    onClick={() => removeDia(gi)}
                    disabled={dias.length === 1}
                    aria-label={dc.removerDia}
                    className={btnRemover}
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeTurno(gi, ti)}
                    aria-label={dc.removerTurno}
                    className={btnRemover}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* adicionar turno a ESTE dia (manhã/tarde) */}
          <button
            type="button"
            onClick={() => addTurno(gi)}
            className="self-start font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            {dc.adicionarTurno}
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={addDia}
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
