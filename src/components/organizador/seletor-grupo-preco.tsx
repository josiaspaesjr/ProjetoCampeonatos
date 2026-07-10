"use client";

import { useRef } from "react";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * Seletor de grupo de preço de um bloco de categorias (mesma classe + sexo).
 * Auto-submete ao mudar; as opções são os nomes das variações dos lotes.
 */
export function SeletorGrupoPreco({
  classeIdade,
  sexo,
  grupoAtual,
  grupos,
  definir,
}: {
  classeIdade: string;
  sexo: string;
  grupoAtual: string;
  grupos: string[];
  definir: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={definir} className="flex items-center">
      <input type="hidden" name="classeIdade" value={classeIdade} />
      <input type="hidden" name="sexo" value={sexo} />
      <NativeSelect
        name="grupo"
        defaultValue={grupoAtual}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Grupo de preço"
        className="h-7 w-auto min-w-[116px] border-white/12 px-2 py-0 font-cond text-[12px] uppercase tracking-[0.03em]"
      >
        <option value="">Sem grupo</option>
        {grupos.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </NativeSelect>
    </form>
  );
}
