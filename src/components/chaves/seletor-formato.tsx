"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  FORMATOS,
  formatoAutomatico,
  formatoDisponivel,
  formatoMeta,
  type FormatoChaveId,
  type FormatoMeta,
  type FormatoSelecionavel,
} from "@/lib/bracket";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/botao-acao";
import { IconeFormato } from "@/components/chaves/formato-icone";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Gatilho + modal para escolher o formato da chave antes de gerar.
 *
 * Mostra um catálogo em cards (ícone + nome + descrição), no espírito da
 * referência Smoothcomp. O card "Automático" é o padrão destacado; formatos
 * sem motor ainda aparecem como "em breve" (desabilitados) e os que não
 * comportam a quantidade de atletas ficam bloqueados com o motivo. Ao
 * confirmar, chama a server action `acao(formato)` numa transition.
 */
export function SeletorFormato({
  acao,
  qtd,
  regenerar = false,
  publicada = false,
  formatoAtual = null,
}: {
  acao: (formato: FormatoSelecionavel, numJurados?: number) => Promise<void>;
  qtd: number;
  regenerar?: boolean;
  /** chave já publicada (sem resultados) — mostra aviso antes de substituir */
  publicada?: boolean;
  formatoAtual?: FormatoChaveId | null;
}) {
  const ch = useDic().admin.chaves;
  const c = useDic().admin.comum;
  const s = ch.seletor;

  const [aberto, setAberto] = useState(false);
  // Pré-seleciona o formato atual, mas cai em "Automático" se ele tiver saído
  // de cena (ex.: virou "em breve") — assim um card desabilitado nunca começa
  // selecionado nem escapa pela regeneração.
  const [selecionado, setSelecionado] = useState<FormatoSelecionavel>(() =>
    formatoAtual && formatoMeta(formatoAtual).implementado ? formatoAtual : "auto",
  );
  const [numJurados, setNumJurados] = useState(3);
  const [enviando, iniciar] = useTransition();
  const enviandoRef = useRef(false);

  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();

  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando]);

  useEffect(() => {
    if (!aberto) return;
    const gatilho = gatilhoRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviandoRef.current) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
      gatilho?.focus();
    };
  }, [aberto]);

  function fechar() {
    if (enviandoRef.current) return;
    setAberto(false);
  }

  function confirmar() {
    iniciar(async () => {
      await acao(
        selecionado,
        selecionado === "votacao_jurados" ? numJurados : undefined,
      );
      setAberto(false); // se houver redirect, a navegação já desmontou isto
    });
  }

  const fmtAuto = formatoAutomatico(qtd);

  /** motivo pelo qual um card fica bloqueado, ou null se disponível */
  function motivoBloqueio(meta: FormatoMeta): string | null {
    if (!meta.implementado) return s.emBreve;
    if (formatoDisponivel(meta, qtd)) return null;
    if (meta.minAtletas === meta.maxAtletas) {
      return `${s.exigeExatamente} ${meta.minAtletas} ${s.atletas}`;
    }
    return `${s.exigeMin} ${meta.minAtletas} ${s.atletas}`;
  }

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {regenerar ? ch.regenerar : ch.gerarChave}
      </button>

      {aberto &&
        createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 animate-[fade-in_0.18s_ease]"
            onClick={(e) => {
              if (e.target === e.currentTarget) fechar();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              className="relative flex max-h-[90vh] w-[min(920px,95vw)] flex-col border border-white/10 bg-surface animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
            >
              <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />

              <div className="flex items-baseline justify-between gap-4 border-b border-white/8 p-5">
                <h2 id={tituloId} className="disp text-[24px] leading-none">
                  {s.titulo}
                </h2>
                <span className="font-cond text-xs uppercase tracking-[0.04em] text-muted-2">
                  {qtd} {s.atletasConfirmados}
                </span>
              </div>

              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-5">
                {regenerar && publicada && (
                  <p className="rounded-md bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
                    {s.avisoRegerarPublicada}
                  </p>
                )}
                {/* Card Automático — padrão destacado */}
                <button
                  type="button"
                  onClick={() => setSelecionado("auto")}
                  aria-pressed={selecionado === "auto"}
                  className={cn(
                    "relative flex items-center gap-4 border p-4 text-left transition-colors",
                    selecionado === "auto"
                      ? "border-brand bg-brand/5"
                      : "border-white/12 hover:border-white/35",
                  )}
                >
                  <IconeFormato
                    id="auto"
                    className={cn(
                      "h-10 w-14 shrink-0",
                      selecionado === "auto" ? "text-brand" : "text-muted-2",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-cond text-sm font-bold uppercase tracking-[0.03em]">
                        {s.automaticoNome}
                      </span>
                      <span className="border border-brand/50 px-1.5 py-0.5 font-cond text-[10px] font-bold uppercase tracking-[0.06em] text-brand">
                        {s.recomendado}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-muted-2">
                      {s.automaticoDesc}{" "}
                      <span className="text-text-2">
                        {s.automaticoNesta} {ch.formatos[fmtAuto].nome}
                      </span>
                    </p>
                  </div>
                </button>

                {/* Catálogo de formatos */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FORMATOS.map((meta) => {
                    const info = ch.formatos[meta.id];
                    const bloqueio = motivoBloqueio(meta);
                    const ativo = selecionado === meta.id;
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        disabled={bloqueio !== null}
                        onClick={() => setSelecionado(meta.id)}
                        aria-pressed={ativo}
                        className={cn(
                          "group relative flex flex-col items-center gap-2 border p-4 text-center transition-colors",
                          bloqueio
                            ? "cursor-not-allowed border-white/8 opacity-45"
                            : ativo
                              ? "border-brand bg-brand/5"
                              : "cursor-pointer border-white/12 hover:border-white/35",
                        )}
                      >
                        {bloqueio && !meta.implementado && (
                          <span className="absolute right-2 top-2 border border-white/15 px-1.5 py-0.5 font-cond text-[9px] font-bold uppercase tracking-[0.06em] text-muted-3">
                            {bloqueio}
                          </span>
                        )}
                        <IconeFormato
                          id={meta.id}
                          className={cn(
                            "h-10 w-16 shrink-0",
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
                        <span className="mt-auto pt-1 text-[11px] leading-snug text-muted-3">
                          {bloqueio && meta.implementado
                            ? bloqueio
                            : `${s.quandoUsar} ${info.quando}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-white/8 p-5">
                <div className="min-h-[40px]">
                  {selecionado === "votacao_jurados" && (
                    <label className="flex items-center gap-2 font-cond text-sm uppercase tracking-[0.04em] text-muted-2">
                      {s.numJurados}
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={numJurados}
                        onChange={(e) =>
                          setNumJurados(
                            Math.max(1, Math.min(9, Math.round(Number(e.target.value) || 1))),
                          )
                        }
                        className="h-10 w-16 border border-white/16 bg-transparent px-2 text-center text-sm text-foreground"
                      />
                    </label>
                  )}
                </div>
                <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={fechar}
                  disabled={enviando}
                  className="inline-flex h-10 items-center justify-center border border-white/16 px-5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-50"
                >
                  {c.cancelar}
                </button>
                <Button
                  type="button"
                  onClick={confirmar}
                  disabled={enviando}
                  aria-busy={enviando}
                >
                  {enviando && <Spinner className="h-3.5 w-3.5" />}
                  {regenerar ? ch.regenerar : ch.gerarChave}
                </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
