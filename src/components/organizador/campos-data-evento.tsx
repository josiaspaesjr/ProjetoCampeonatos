"use client";

import { Input } from "@/components/ui/input";
import { CamposDiasEvento, type DiaEvento } from "./campos-dias-evento";

/**
 * Dias do evento (data + início/fim, um ou mais) + prazo de inscrição.
 * Compartilhado entre criar e editar evento. `dataInicio`/`dataFim` do evento
 * são derivados dos dias no servidor. Como fica dentro do <form>, remonta junto
 * e o estado volta ao default.
 */
export function CamposDataEvento({
  labelCls,
  inputClassName,
  fechamLabel,
  defaultDias,
  defaultInscricoesFecham = "",
}: {
  labelCls: string;
  inputClassName?: string;
  fechamLabel: string;
  /** dias existentes (edição); vazio na criação → uma linha em branco */
  defaultDias?: DiaEvento[];
  defaultInscricoesFecham?: string;
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <CamposDiasEvento
        labelCls={labelCls}
        inputClassName={inputClassName}
        defaultDias={defaultDias}
      />
      <div className="flex flex-col gap-2">
        <label className={labelCls} htmlFor="ev-fecham">
          {fechamLabel}
        </label>
        <Input
          id="ev-fecham"
          type="datetime-local"
          name="inscricoesFecham"
          defaultValue={defaultInscricoesFecham || undefined}
          className={inputClassName}
        />
      </div>
    </div>
  );
}
