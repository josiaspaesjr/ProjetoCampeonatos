"use client";

import { useState } from "react";
import {
  ORDEM_PAPEIS,
  PAPEIS,
  SECOES,
  papelDe,
  type Secao,
} from "@/lib/eventos/permissoes";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Escolhe o que um colaborador pode acessar no console do evento.
 *
 * Os papéis são atalhos: clicar em "Mesário" marca chaves + áreas. O que o
 * form envia são sempre as seções (`name="permissoes"`), então dá para ajustar
 * qualquer combinação na mão — nesse caso nenhum papel fica aceso.
 */
export function SeletorPermissoes({
  inicial,
  className,
}: {
  /** seções já liberadas (edição); vazio = começa em acesso total */
  inicial?: readonly Secao[];
  className?: string;
}) {
  const t = useDic().admin.equipe;
  const [secoes, setSecoes] = useState<Secao[]>(() =>
    inicial?.length ? [...inicial] : [...PAPEIS.total],
  );
  const papelAtivo = papelDe(secoes);

  const alternar = (s: Secao) =>
    setSecoes((atual) =>
      atual.includes(s) ? atual.filter((x) => x !== s) : [...atual, s],
    );

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2">
          {t.papel}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {ORDEM_PAPEIS.map((papel) => {
            const ativo = papelAtivo === papel;
            return (
              <button
                key={papel}
                type="button"
                onClick={() => setSecoes([...PAPEIS[papel]])}
                aria-pressed={ativo}
                className={cn(
                  "cursor-pointer border p-3 text-left transition-colors",
                  ativo
                    ? "border-brand bg-brand/5"
                    : "border-white/12 hover:border-white/35",
                )}
              >
                <span
                  className={cn(
                    "font-cond text-sm font-bold uppercase tracking-[0.03em]",
                    ativo && "text-brand",
                  )}
                >
                  {t.papeis[papel]}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-2">
                  {t.papeisDesc[papel]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2">
          {t.podeAcessar}
          {!papelAtivo && (
            <span className="ml-2 font-normal normal-case tracking-normal text-brand-soft">
              {t.personalizado}
            </span>
          )}
        </p>
        <div className="mt-2 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
          {SECOES.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2.5 py-1 text-sm"
            >
              <input
                type="checkbox"
                name="permissoes"
                value={s}
                checked={secoes.includes(s)}
                onChange={() => alternar(s)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
              />
              <span className={secoes.includes(s) ? "" : "text-muted-2"}>
                {t.secoes[s]}
              </span>
            </label>
          ))}
        </div>
        {secoes.length === 0 && (
          <p className="mt-2 text-xs text-destructive">{t.escolhaUmaSecao}</p>
        )}
      </div>
    </div>
  );
}
