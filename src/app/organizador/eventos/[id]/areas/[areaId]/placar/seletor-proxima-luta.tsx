"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDic } from "@/lib/i18n/client";
import { Spinner } from "@/components/ui/botao-acao";
import { definirProximaLuta } from "../../actions";

/** uma luta pendente da área, já achatada pelo server component */
export interface OpcaoLuta {
  lutaId: string;
  /** rótulo curto da categoria ("Preta Pena (até 70kg)") */
  categoria: string;
  /** nome completo da categoria (entra na busca) */
  categoriaCompleta: string;
  /** horário estimado formatado ("09:12") */
  hora: string;
  atleta1: string;
  atleta2: string;
  academia1: string | null;
  academia2: string | null;
  /** os dois atletas definidos — só essas podem ir para o tatame */
  pronta: boolean;
  /** é a que está no tatame agora */
  atual: boolean;
}

/** normaliza para busca: minúsculas sem acento */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Seletor de **próxima luta** do tatame. Abre um painel com a fila pendente da
 * área, com busca por atleta, academia ou categoria; escolher uma chama
 * `definirProximaLuta`, que a move para a frente da fila (`ordemCronograma`) —
 * o placar passa a operá-la e o cronograma da área se reajusta sozinho.
 * Lutas que ainda dependem de um vencedor aparecem, mas não são selecionáveis.
 */
export function SeletorProximaLuta({
  eventoId,
  areaId,
  opcoes,
}: {
  eventoId: string;
  areaId: string;
  opcoes: OpcaoLuta[];
}) {
  const p = useDic().admin.placar;
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [pendente, setPendente] = useState<string | null>(null);
  const [salvando, iniciarTransicao] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // painel aberto: foca a busca, trava o scroll do fundo e fecha com Esc
  useEffect(() => {
    if (!aberto) return;
    inputRef.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  const q = norm(busca.trim());
  const visiveis = useMemo(() => {
    if (!q) return opcoes;
    return opcoes.filter((o) =>
      norm(
        `${o.atleta1} ${o.atleta2} ${o.academia1 ?? ""} ${o.academia2 ?? ""} ${o.categoriaCompleta}`,
      ).includes(q),
    );
  }, [opcoes, q]);

  function escolher(o: OpcaoLuta) {
    if (!o.pronta || o.atual || salvando) return;
    setPendente(o.lutaId);
    iniciarTransicao(async () => {
      await definirProximaLuta(eventoId, areaId, o.lutaId);
      router.refresh();
      setPendente(null);
      setAberto(false);
      setBusca("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg bg-white/10 px-3 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:bg-white/20"
      >
        ⌕ {p.escolherLuta}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/70 p-4 pt-[6vh]"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/12 bg-zinc-950 text-white shadow-2xl"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="font-cond text-lg font-bold uppercase tracking-[0.04em]">
                  {p.escolherTitulo}
                </p>
                <p className="mt-0.5 font-cond text-xs uppercase tracking-[0.04em] text-white/50">
                  {p.escolherTexto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:bg-white/20"
              >
                ✕ {p.escolherFechar}
              </button>
            </div>

            {/* BUSCA */}
            <div className="border-b border-white/10 px-5 py-3">
              <input
                ref={inputRef}
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={p.escolherBuscar}
                className="w-full rounded-lg border border-white/14 bg-zinc-900 px-4 py-2.5 font-cond text-[15px] uppercase tracking-[0.02em] text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
              />
            </div>

            {/* LISTA */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {opcoes.length === 0 ? (
                <p className="px-5 py-10 text-center font-cond text-sm uppercase tracking-[0.04em] text-white/45">
                  {p.escolherFilaVazia}
                </p>
              ) : visiveis.length === 0 ? (
                <p className="px-5 py-10 text-center font-cond text-sm uppercase tracking-[0.04em] text-white/45">
                  {p.escolherVazio}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {visiveis.map((o) => (
                    <li key={o.lutaId} className="border-b border-white/8">
                      <button
                        type="button"
                        onClick={() => escolher(o)}
                        disabled={!o.pronta || o.atual || salvando}
                        className={cn(
                          "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors",
                          o.atual
                            ? "bg-white/[0.06]"
                            : o.pronta
                              ? "hover:bg-white/[0.08]"
                              : "opacity-45",
                          !o.pronta && "cursor-not-allowed",
                          salvando && "cursor-wait",
                        )}
                      >
                        <span className="w-14 shrink-0 font-cond text-base font-bold tabular-nums text-white/70">
                          {o.hora}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-cond text-[15px] font-semibold uppercase tracking-[0.02em]">
                            {o.atleta1}
                            <span className="mx-2 text-white/40">×</span>
                            {o.atleta2}
                          </span>
                          <span className="block truncate font-cond text-xs uppercase tracking-[0.05em] text-white/45">
                            {o.categoria}
                            {(o.academia1 || o.academia2) && (
                              <>
                                {" · "}
                                {[o.academia1, o.academia2]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </>
                            )}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          {pendente === o.lutaId ? (
                            <span className="inline-flex items-center gap-2 font-cond text-xs uppercase tracking-[0.05em] text-white/60">
                              <Spinner /> {p.escolherSalvando}
                            </span>
                          ) : o.atual ? (
                            <Selo tom="atual">{p.escolherAtual}</Selo>
                          ) : !o.pronta ? (
                            <Selo tom="espera">{p.escolherAguardando}</Selo>
                          ) : (
                            <Selo tom="acao">{p.escolherPuxar} →</Selo>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Selo({
  tom,
  children,
}: {
  tom: "atual" | "espera" | "acao";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 font-cond text-[11px] font-bold uppercase tracking-[0.06em] whitespace-nowrap",
        tom === "atual" && "border-green-500/40 bg-green-500/10 text-green-300",
        tom === "espera" && "border-white/15 text-white/45",
        tom === "acao" && "border-white/20 text-white/75",
      )}
    >
      {children}
    </span>
  );
}
