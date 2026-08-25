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
  const [trocaEmCurso, iniciarTransicao] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // trocar de luta = server action + refresh do RSC (pode demorar). Enquanto a
  // transição está em curso E a escolhida ainda não voltou como a do tatame, o
  // loading cobre o painel. Terminada a transição a troca é dada por concluída
  // de qualquer jeito — a luta pode até ter saído da fila depois (encerrada),
  // e o painel não pode voltar a "carregar" por causa disso.
  const lutaEscolhida = pendente
    ? opcoes.find((o) => o.lutaId === pendente)
    : undefined;
  const trocaConcluida =
    pendente !== null && (!trocaEmCurso || Boolean(lutaEscolhida?.atual));
  const trocando = pendente !== null && !trocaConcluida;
  const painelAberto = aberto && !trocaConcluida;

  // painel aberto: foca a busca, trava o scroll do fundo e fecha com Esc
  useEffect(() => {
    if (!painelAberto) return;
    inputRef.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !trocando) setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [painelAberto, trocando]);

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
    if (!o.pronta || o.atual || trocando) return;
    setPendente(o.lutaId);
    iniciarTransicao(async () => {
      try {
        await definirProximaLuta(eventoId, areaId, o.lutaId);
        router.refresh();
      } catch {
        // falhou: solta o loading para o operador tentar de novo
        setPendente(null);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPendente(null);
          setBusca("");
          setAberto(true);
        }}
        className="rounded-lg bg-white/10 px-3 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:bg-white/20"
      >
        ⌕ {p.escolherLuta}
      </button>

      {painelAberto && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/70 p-4 pt-[6vh]"
          onClick={() => !trocando && setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/12 bg-zinc-950 text-white shadow-2xl"
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
                disabled={trocando}
                className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                        disabled={!o.pronta || o.atual || trocando}
                        className={cn(
                          "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors",
                          o.atual
                            ? "bg-white/[0.06]"
                            : o.pronta
                              ? "hover:bg-white/[0.08]"
                              : "opacity-45",
                          !o.pronta && "cursor-not-allowed",
                          trocando && "cursor-wait",
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

            {/* LOADING DA TROCA: cobre o painel até o placar novo renderizar */}
            {trocando && (
              <div
                role="status"
                aria-live="polite"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/85 px-6 text-center backdrop-blur-sm"
              >
                <Spinner className="h-8 w-8 border-[3px] text-white/80" />
                <p className="font-cond text-lg font-bold uppercase tracking-[0.04em]">
                  {p.escolherTrocando}
                </p>
                {lutaEscolhida && (
                  <p className="font-cond text-sm uppercase tracking-[0.03em] text-white/70">
                    {lutaEscolhida.atleta1}
                    <span className="mx-2 text-white/40">×</span>
                    {lutaEscolhida.atleta2}
                  </p>
                )}
                <p className="max-w-sm font-cond text-xs uppercase tracking-[0.04em] text-white/45">
                  {p.escolherTrocandoNota}
                </p>
              </div>
            )}
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
