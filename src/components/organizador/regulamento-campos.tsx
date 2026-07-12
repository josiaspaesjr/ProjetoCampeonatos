"use client";

import { useState } from "react";
import { SECOES_REGULAMENTO } from "@/lib/regulamento";
import { cn } from "@/lib/utils";
import { useDic } from "@/lib/i18n/client";

/**
 * Campos opcionais do regulamento: uma seção por tópico, começando vazia,
 * com botão "Inserir texto padrão" (preenche com o modelo editável) e
 * "limpar". Cada seção envia `reg_<chave>` no form. Reutilizado em criar e
 * editar evento; `valores` traz o conteúdo já salvo (edição).
 */
export function RegulamentoCampos({
  valores,
}: {
  valores?: Record<string, string>;
}) {
  const [textos, setTextos] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const s of SECOES_REGULAMENTO) inicial[s.chave] = valores?.[s.chave] ?? "";
    return inicial;
  });

  const setTexto = (chave: string, valor: string) =>
    setTextos((prev) => ({ ...prev, [chave]: valor }));

  const dic = useDic();
  const dr = dic.admin.regCampos;
  const rt = dic.regulamentoTitulos;

  return (
    <div className="flex flex-col gap-2">
      {SECOES_REGULAMENTO.map((secao) => {
        const valor = textos[secao.chave] ?? "";
        const preenchido = valor.trim().length > 0;
        return (
          <details
            key={secao.chave}
            className="group border border-white/10 bg-raised/60 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 -skew-x-9",
                  preenchido ? "bg-brand" : "bg-white/20",
                )}
              />
              <span className="flex-1 font-cond text-[17px] font-semibold uppercase tracking-[0.03em]">
                {rt[secao.chave] ?? secao.titulo}
              </span>
              {preenchido && (
                <span className="font-cond text-[11px] uppercase tracking-[0.08em] text-brand-soft">
                  {dr.preenchido}
                </span>
              )}
              <span className="font-cond text-xs text-muted-3 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>

            <div className="flex flex-col gap-2.5 border-t border-white/8 px-4 py-3.5">
              <textarea
                name={`reg_${secao.chave}`}
                value={valor}
                onChange={(e) => setTexto(secao.chave, e.target.value)}
                rows={5}
                placeholder={dr.placeholder}
                className="w-full resize-y border border-input bg-raised px-3.5 py-2.5 text-[15px] leading-normal transition-colors placeholder:text-muted-3 focus-visible:border-brand focus-visible:outline-none"
              />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setTexto(secao.chave, secao.textoPadrao)}
                  className="font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-brand transition-colors hover:text-brand-soft"
                >
                  {dr.inserirPadrao}
                </button>
                {preenchido && (
                  <button
                    type="button"
                    onClick={() => setTexto(secao.chave, "")}
                    className="font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
                  >
                    {dr.limpar}
                  </button>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
