"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { IconeFormato } from "@/components/chaves/formato-icone";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Formato3 = "round_robin" | "eliminacao_simples";

/**
 * Botão "Gerar N chaves em lote" + modal que pergunta como montar as divisões
 * de **3 atletas**: todos contra todos (round robin, padrão) ou eliminação
 * simples. As de 2 atletas viram luta única e as de 4+ eliminação simples — a
 * escolha só muda o caso de 3. Submete o formato escolhido (`tresAtletas`) para
 * a server action `gerarChavesEmLote`.
 */
export function GerarLoteDialog({
  acao,
  total,
  tres,
}: {
  acao: (formData: FormData) => Promise<void>;
  /** nº de divisões que serão geradas neste lote */
  total: number;
  /** nº dessas divisões com exatamente 3 atletas (a escolha só afeta essas) */
  tres: number;
}) {
  const ch = useDic().admin.chaves;
  const c = useDic().admin.comum;

  const [aberto, setAberto] = useState(false);
  const [formato3, setFormato3] = useState<Formato3>("round_robin");
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!aberto) return;
    const gatilho = gatilhoRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
      gatilho?.focus();
    };
  }, [aberto]);

  const rotuloBotao = (
    <>
      {ch.gerar} {total} {total === 1 ? ch.chaveSing : ch.chavePlur} {ch.emLote}
    </>
  );

  const opcoes: { id: Formato3 }[] = [
    { id: "eliminacao_simples" },
    { id: "round_robin" },
  ];

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center justify-center border border-white/16 bg-brand px-4 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
      >
        {rotuloBotao}
      </button>

      {aberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 animate-[fade-in_0.18s_ease]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAberto(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              className="relative flex max-h-[90vh] w-[min(560px,95vw)] flex-col border border-white/10 bg-surface animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
            >
              <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />

              <div className="flex items-baseline justify-between gap-4 border-b border-white/8 p-5">
                <h2 id={tituloId} className="disp text-[24px] leading-none">
                  {ch.loteTitulo}
                </h2>
                <span className="font-cond text-xs uppercase tracking-[0.04em] text-muted-2">
                  {total} {total === 1 ? ch.chaveSing : ch.chavePlur}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
                <div>
                  <p className="font-cond text-sm font-bold uppercase tracking-[0.03em]">
                    {ch.lotePergunta}
                  </p>
                  <p className="mt-1 text-xs text-muted-2">
                    {tres > 0
                      ? `${tres} ${
                          tres === 1 ? ch.loteDivisaoSing : ch.loteDivisaoPlur
                        } ${ch.loteComTres}`
                      : ch.loteSemTres}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {opcoes.map(({ id }) => {
                    const info = ch.formatos[id];
                    const ativo = formato3 === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormato3(id)}
                        aria-pressed={ativo}
                        className={cn(
                          "group flex flex-col items-center gap-2 border p-4 text-center transition-colors",
                          ativo
                            ? "border-brand bg-brand/5"
                            : "border-white/12 hover:border-white/35",
                        )}
                      >
                        <IconeFormato
                          id={id}
                          className={cn(
                            "h-9 w-14 shrink-0",
                            ativo
                              ? "text-brand"
                              : "text-muted-2 group-hover:text-foreground",
                          )}
                        />
                        <span className="font-cond text-sm font-bold uppercase tracking-[0.03em]">
                          {info.nome}
                        </span>
                        <span className="text-xs leading-snug text-muted-2">
                          {info.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] leading-snug text-muted-3">
                  {ch.loteNota}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-white/8 p-5">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="inline-flex h-10 items-center justify-center border border-white/16 px-5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground"
                >
                  {c.cancelar}
                </button>
                <form action={acao}>
                  <input type="hidden" name="tresAtletas" value={formato3} />
                  <BotaoAcao>{rotuloBotao}</BotaoAcao>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
