"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useDic } from "@/lib/i18n/client";

/**
 * Data do evento + prazo de inscrição, lado a lado. As inscrições não podem
 * fechar depois do dia do evento: o `max` do datetime-local acompanha a data
 * escolhida (o servidor revalida a mesma regra). Compartilhado entre criar e
 * editar evento — como fica dentro do <form>, remonta junto com ele e o estado
 * volta ao default.
 */
export function CamposDataEvento({
  gridClassName,
  labelCls,
  inputClassName,
  fechamLabel,
  obrigatorio = false,
  defaultDataInicio = "",
  defaultInscricoesFecham = "",
}: {
  gridClassName: string;
  labelCls: string;
  inputClassName?: string;
  fechamLabel: string;
  obrigatorio?: boolean;
  defaultDataInicio?: string;
  defaultInscricoesFecham?: string;
}) {
  const [dataInicio, setDataInicio] = useState(defaultDataInicio);
  const maxFecham = dataInicio ? `${dataInicio}T23:59` : undefined;
  const dc = useDic().admin.campos;

  return (
    <div className={gridClassName}>
      <div className="flex flex-col gap-2">
        <label className={labelCls} htmlFor="ev-data">
          {dc.dataEvento} {obrigatorio && <span className="text-brand">*</span>}
        </label>
        <Input
          id="ev-data"
          type="date"
          name="dataInicio"
          required
          defaultValue={defaultDataInicio || undefined}
          onChange={(e) => setDataInicio(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className={labelCls} htmlFor="ev-fecham">
          {fechamLabel}
        </label>
        <Input
          id="ev-fecham"
          type="datetime-local"
          name="inscricoesFecham"
          defaultValue={defaultInscricoesFecham || undefined}
          max={maxFecham}
          className={inputClassName}
        />
      </div>
    </div>
  );
}
