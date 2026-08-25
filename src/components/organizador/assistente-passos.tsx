"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDic } from "@/lib/i18n/client";

/** um passo do assistente */
export interface PassoAssistente {
  id: string;
  titulo: string;
  /** estado atual em uma linha (aparece na trilha e no modo recolhido) */
  resumo?: string;
  conteudo: React.ReactNode;
  /** ação própria do passo (o último traz o "Estruturar áreas") */
  acao?: React.ReactNode;
}

/**
 * Assistente da tela de Áreas: leva o organizador pelos passos da configuração
 * (dias → tempo de luta → categorias por dia → ordem do dia → montagem) em vez
 * de empilhar todos os cartões na tela. A trilha numerada é clicável — quem já
 * conhece o fluxo pula direto para o passo que quer.
 *
 * Com as áreas já estruturadas ele começa **recolhido**: vira uma linha de
 * resumo, e o cronograma fica em primeiro plano.
 */
export function AssistentePassos({
  titulo,
  passos,
  aberto,
  onAlternar,
  passoInicial = 0,
}: {
  titulo: string;
  passos: PassoAssistente[];
  aberto: boolean;
  onAlternar: () => void;
  passoInicial?: number;
}) {
  const ta = useDic().admin.areas;
  const [atual, setAtual] = useState(passoInicial);

  const i = Math.min(atual, passos.length - 1);
  const passo = passos[i];
  const primeiro = i === 0;
  const ultimo = i === passos.length - 1;

  return (
    <div className="relative border border-white/10 bg-surface">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />

      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] pb-3 pt-[18px]">
        <div className="min-w-0">
          <span className="disp text-[22px]">{titulo}</span>
          {aberto && (
            <span className="ml-3 font-cond text-[12px] uppercase tracking-[0.08em] text-muted-3">
              {ta.assistentePasso} {i + 1} {ta.assistenteDe} {passos.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          className="inline-flex -skew-x-9 items-center border border-white/14 px-3 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
        >
          <span className="inline-block skew-x-9">
            {aberto ? ta.secaoOcultar : ta.assistenteAjustar}
          </span>
        </button>
      </div>

      {/* RECOLHIDO: uma linha por passo, só com o resumo */}
      {!aberto ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/10 px-[22px] py-3">
          {passos.map((p, k) => (
            <span
              key={p.id}
              className="font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3"
            >
              <span className="text-muted-2">
                {k + 1}. {p.titulo}
              </span>
              {p.resumo && (
                <span className="ml-1.5 text-text-2">{p.resumo}</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <>
          {/* TRILHA */}
          <div className="flex gap-1 overflow-x-auto border-y border-white/10 px-[14px] py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {passos.map((p, k) => {
              const ativo = k === i;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAtual(k)}
                  aria-current={ativo ? "step" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 px-3 py-1.5 text-left transition-colors",
                    ativo ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 -skew-x-9 items-center justify-center font-cond text-[12px] font-bold",
                      ativo
                        ? "bg-brand text-white"
                        : "border border-white/16 text-muted-2",
                    )}
                  >
                    <span className="inline-block skew-x-9">{k + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block whitespace-nowrap font-cond text-[13px] font-semibold uppercase tracking-[0.04em]",
                        ativo ? "text-foreground" : "text-muted-2",
                      )}
                    >
                      {p.titulo}
                    </span>
                    {p.resumo && (
                      <span className="block whitespace-nowrap font-cond text-[11px] uppercase tracking-[0.04em] text-muted-3">
                        {p.resumo}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CONTEÚDO DO PASSO */}
          <div className="px-[22px] py-5">{passo.conteudo}</div>

          {/* NAVEGAÇÃO */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-[22px] py-3.5">
            <button
              type="button"
              onClick={() => setAtual((v) => Math.max(0, v - 1))}
              disabled={primeiro}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="inline-block skew-x-9">
                ← {ta.assistenteVoltar}
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {passo.acao}
              {!ultimo && (
                <button
                  type="button"
                  onClick={() =>
                    setAtual((v) => Math.min(passos.length - 1, v + 1))
                  }
                  className="inline-flex -skew-x-9 items-center border border-white/16 px-5 py-2.5 font-cond text-[14px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-brand/50 hover:text-brand-soft"
                >
                  <span className="inline-block skew-x-9">
                    {ta.assistenteContinuar} →
                  </span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
