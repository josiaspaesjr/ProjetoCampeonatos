"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/ui/botao-acao";

/**
 * Gatilho + modal de confirmação para ações destrutivas (excluir/apagar).
 *
 * O gatilho é um <button> cuja aparência vem do call site (`rotulo` + `className`),
 * então cabe tanto num "×" de chip quanto num link "excluir". Ao confirmar,
 * chama a server action `acao` numa transition (spinner + botões travados
 * enquanto roda). Fecha no Esc, no clique no fundo e no Cancelar — nunca durante
 * o envio. O modal vai por portal no <body> para não aninhar <div> dentro de
 * <span> nem esbarrar em stacking context/overflow do container.
 */
export function ConfirmarExclusao({
  acao,
  titulo,
  descricao,
  confirmarRotulo = "Excluir",
  rotulo,
  className,
  title,
}: {
  acao: () => Promise<void>;
  titulo: string;
  descricao: ReactNode;
  confirmarRotulo?: string;
  rotulo: ReactNode;
  className?: string;
  title?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [enviando, iniciar] = useTransition();
  const enviandoRef = useRef(false);

  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const descId = useId();

  // espelha o pending num ref para os handlers (Esc/fundo) lerem o valor atual
  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando]);

  function fechar() {
    if (enviandoRef.current) return; // não abandona a exclusão em curso
    setAberto(false);
  }

  function confirmar() {
    iniciar(async () => {
      await acao();
      setAberto(false); // no caso de redirect a navegação já desmontou isto
    });
  }

  useEffect(() => {
    if (!aberto) return;
    const gatilho = gatilhoRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviandoRef.current) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    cancelarRef.current?.focus(); // foco no Cancelar: padrão seguro em destrutivo
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
      gatilho?.focus(); // devolve o foco ao gatilho ao fechar
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        title={title}
        className={className}
      >
        {rotulo}
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
              aria-describedby={descId}
              className="relative w-[min(440px,94vw)] border border-white/10 bg-surface animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
            >
              <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
              <div className="p-6">
                <h2 id={tituloId} className="disp text-[26px] leading-none">
                  {titulo}
                </h2>
                <p
                  id={descId}
                  className="mt-3 font-cond text-sm uppercase leading-snug tracking-[0.03em] text-muted-2"
                >
                  {descricao}
                </p>
                <div className="mt-6 flex gap-2.5">
                  <button
                    ref={cancelarRef}
                    type="button"
                    onClick={fechar}
                    disabled={enviando}
                    className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center border border-white/16 px-4 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={enviando}
                    aria-busy={enviando}
                    className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 bg-brand px-4 font-cond text-sm font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-wait disabled:opacity-70"
                  >
                    {enviando && <Spinner className="h-3.5 w-3.5" />}
                    {enviando ? "Excluindo…" : confirmarRotulo}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
