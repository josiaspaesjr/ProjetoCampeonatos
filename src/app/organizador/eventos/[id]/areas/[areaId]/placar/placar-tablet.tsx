"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { MetodoVitoria } from "@/lib/bracket";
import { Spinner } from "@/components/ui/botao-acao";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  encerrarLutaDoPlacar,
  salvarCronometro,
  salvarPlacarParcial,
} from "../../actions";

interface Props {
  eventoId: string;
  chaveId: string;
  lutaId: string;
  categoriaNome: string;
  duracaoSegundos: number;
  atleta1: { id: string; nome: string; academia: string | null };
  atleta2: { id: string; nome: string; academia: string | null };
  /** parcial persistido — sobrevive a recarga do tablet no meio da luta */
  placarInicial?: { l1: Lado; l2: Lado };
  /** cronômetro persistido — restaura o relógio ao recarregar e alimenta o telão */
  cronometroInicial?: {
    restanteSeg: number | null;
    rodando: boolean;
    atualizadoEmMs: number | null;
  };
}

interface Lado {
  pontos: number;
  vantagens: number;
  punicoes: number;
}

const zerado: Lado = { pontos: 0, vantagens: 0, punicoes: 0 };

const METODOS: MetodoVitoria[] = [
  "pontos",
  "vantagens",
  "finalizacao",
  "decisao",
  "wo",
  "dq",
];

function fmt(seg: number) {
  const m = Math.floor(Math.abs(seg) / 60);
  const s = Math.abs(seg) % 60;
  return `${seg < 0 ? "-" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type DicPlacar = ReturnType<typeof useDic>["admin"]["placarTablet"];

/** Contador (advantage/penalty): rótulo pequeno em cima, número grande cinza. */
function Contador({
  rotulo,
  valor,
  grande,
}: {
  rotulo: string;
  valor: number;
  grande: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "font-cond font-semibold uppercase tracking-[0.1em] text-white/55",
          grande ? "text-base" : "text-xs",
        )}
      >
        {rotulo}
      </span>
      <span
        className={cn(
          "font-black tabular-nums leading-none text-white",
          grande ? "text-7xl sm:text-8xl" : "text-5xl sm:text-6xl",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

/** Botão da grade de scoring — verde soma, vermelho corrige. */
function BotaoGrade({
  texto,
  somar,
  onClick,
  grande,
}: {
  texto: string;
  somar: boolean;
  onClick: () => void;
  grande: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md font-semibold tabular-nums transition-colors",
        somar
          ? "bg-white/[0.04] text-green-400/75 hover:bg-green-500/20 hover:text-green-300"
          : "bg-white/[0.02] text-red-400/70 hover:bg-red-500/20 hover:text-red-300",
        grande ? "py-2.5 text-lg sm:text-xl" : "py-2 text-sm sm:text-base",
      )}
    >
      {texto}
    </button>
  );
}

/** Botão pequeno de ajuste do cronômetro (±1s / ±30s). */
function BotaoTempo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white/10 px-3 py-2 font-cond text-sm font-semibold tabular-nums text-white/80 transition-colors hover:bg-white/20"
    >
      {texto}
    </button>
  );
}

/**
 * Uma LINHA do placar (um atleta), no layout do placar profissional: grade de
 * scoring `+ / −` à esquerda (fundo escuro), contadores de vantagem/punição no
 * meio e o placar de pontos num bloco de cor sólida (azul/vermelho) à direita.
 * Em tela cheia (`grande`) a linha estica para preencher metade da altura.
 */
function LinhaAtleta({
  atleta,
  dados,
  cor,
  grande,
  t,
  onAjustar,
}: {
  atleta: { nome: string; academia: string | null };
  dados: Lado;
  cor: string;
  grande: boolean;
  t: DicPlacar;
  onAjustar: (campo: keyof Lado, delta: number) => void;
}) {
  // colunas da grade: pontos 2/3/4, vantagem (V/A) e punição (P)
  const cols: { rotulo: string; campo: keyof Lado; valor: number }[] = [
    { rotulo: "2", campo: "pontos", valor: 2 },
    { rotulo: "3", campo: "pontos", valor: 3 },
    { rotulo: "4", campo: "pontos", valor: 4 },
    { rotulo: t.vantagemLetra, campo: "vantagens", valor: 1 },
    { rotulo: t.punicaoLetra, campo: "punicoes", valor: 1 },
  ];
  return (
    <div className={cn("flex items-stretch gap-2 sm:gap-3", grande && "min-h-0 flex-1")}>
      {/* grade de scoring (esquerda, fundo escuro) */}
      <div className="flex flex-1 flex-col justify-center rounded-xl bg-zinc-900 p-2 sm:p-3">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {cols.map((c) => (
            <BotaoGrade
              key={"+" + c.rotulo}
              texto={"+" + c.rotulo}
              somar
              onClick={() => onAjustar(c.campo, c.valor)}
              grande={grande}
            />
          ))}
          {cols.map((c) => (
            <BotaoGrade
              key={"-" + c.rotulo}
              texto={"−" + c.rotulo}
              somar={false}
              onClick={() => onAjustar(c.campo, -c.valor)}
              grande={grande}
            />
          ))}
        </div>
      </div>

      {/* contadores de vantagem/punição (fundo escuro) */}
      <div className="flex items-center gap-6 rounded-xl bg-zinc-900 px-5 sm:gap-8 sm:px-8">
        <Contador rotulo={t.vantagensLabel} valor={dados.vantagens} grande={grande} />
        <Contador rotulo={t.punicoesLabel} valor={dados.punicoes} grande={grande} />
      </div>

      {/* nome + academia + placar num bloco de cor sólida (direita) */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-4 text-white",
          cor,
          grande ? "w-64 sm:w-80" : "w-48 sm:w-60",
        )}
      >
        <div className="w-full text-center">
          <p
            className={cn(
              "truncate font-bold uppercase leading-tight",
              grande ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
            )}
          >
            {atleta.nome}
          </p>
          {atleta.academia && (
            <p
              className={cn(
                "truncate font-cond uppercase tracking-[0.04em] opacity-70",
                grande ? "text-sm sm:text-base" : "text-xs",
              )}
            >
              {atleta.academia}
            </p>
          )}
        </div>
        <span
          className={cn(
            "font-black tabular-nums leading-none",
            grande ? "text-8xl sm:text-9xl" : "text-7xl sm:text-8xl",
          )}
        >
          {dados.pontos}
        </span>
      </div>
    </div>
  );
}

export function PlacarTablet({
  eventoId,
  chaveId,
  lutaId,
  categoriaNome,
  duracaoSegundos,
  atleta1,
  atleta2,
  placarInicial,
  cronometroInicial,
}: Props) {
  const router = useRouter();
  const dic = useDic();
  const t = dic.admin.placarTablet;
  const met = dic.bracket.metodos;
  const [placar, setPlacar] = useState<{ l1: Lado; l2: Lado }>(
    placarInicial ?? { l1: zerado, l2: zerado },
  );
  const lado1 = placar.l1;
  const lado2 = placar.l2;
  // ao recarregar o tablet, o relógio retoma no último valor salvo, porém
  // PAUSADO — o organizador aperta iniciar quando quiser (não mostra tempo
  // defasado nem depende de Date.now no render).
  const [restante, setRestante] = useState(
    cronometroInicial?.restanteSeg ?? duracaoSegundos,
  );
  const [rodando, setRodando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [metodo, setMetodo] = useState<MetodoVitoria>("pontos");
  const [vencedorId, setVencedorId] = useState<string>("");
  const [, startTransition] = useTransition();
  const [confirmando, iniciarConfirmacao] = useTransition();
  // em tela cheia o placar reorganiza os lados em cima/embaixo preenchendo a tela
  const [cheia, setCheia] = useState(false);
  // troca visual dos lados (azul ↔ vermelho na tela), sem mexer nos dados
  const [trocado, setTrocado] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const h = () => setCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => {
    if (rodando) {
      timer.current = setInterval(() => setRestante((r) => r - 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [rodando]);

  // persiste o parcial para o público sempre que o placar muda
  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    startTransition(() => {
      void salvarPlacarParcial(eventoId, lutaId, {
        pontos1: placar.l1.pontos,
        vantagens1: placar.l1.vantagens,
        punicoes1: placar.l1.punicoes,
        pontos2: placar.l2.pontos,
        vantagens2: placar.l2.vantagens,
        punicoes2: placar.l2.punicoes,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placar]);

  // trava scroll do body + Esc fecha o modal (mas nunca durante o envio)
  useEffect(() => {
    if (!encerrando) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmando) setEncerrando(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [encerrando, confirmando]);

  // atualização funcional: cliques em sequência rápida nunca perdem pontos
  const ajustar = (lado: 1 | 2, campo: keyof Lado, delta: number) => {
    setPlacar((prev) => {
      const chave = lado === 1 ? "l1" : "l2";
      const atual = prev[chave];
      return {
        ...prev,
        [chave]: { ...atual, [campo]: Math.max(0, atual[campo] + delta) },
      };
    });
  };

  const sugerirVencedor = (): string => {
    if (lado1.pontos !== lado2.pontos)
      return lado1.pontos > lado2.pontos ? atleta1.id : atleta2.id;
    if (lado1.vantagens !== lado2.vantagens)
      return lado1.vantagens > lado2.vantagens ? atleta1.id : atleta2.id;
    if (lado1.punicoes !== lado2.punicoes)
      return lado1.punicoes < lado2.punicoes ? atleta1.id : atleta2.id;
    return "";
  };

  // grava o âncora do relógio (só em iniciar/pausar/zerar/encerrar) p/ o telão
  const persistirRelogio = (restanteSeg: number, emAndamento: boolean) => {
    startTransition(() => {
      void salvarCronometro(eventoId, lutaId, {
        restanteSeg,
        rodando: emAndamento,
      });
    });
  };

  const alternarRelogio = () => {
    const novo = !rodando;
    setRodando(novo);
    persistirRelogio(restante, novo);
  };

  const zerarRelogio = () => {
    setRodando(false);
    setRestante(duracaoSegundos);
    persistirRelogio(duracaoSegundos, false);
  };

  // ajuste manual do cronômetro (±1s / ±30s); persiste a nova âncora p/ o telão
  const ajustarRelogio = (delta: number) => {
    const novo = Math.max(0, restante + delta);
    setRestante(novo);
    persistirRelogio(novo, rodando);
  };

  const abrirEncerramento = () => {
    setRodando(false);
    persistirRelogio(restante, false);
    const sugerido = sugerirVencedor();
    setVencedorId(sugerido);
    setMetodo(
      lado1.pontos !== lado2.pontos
        ? "pontos"
        : lado1.vantagens !== lado2.vantagens
          ? "vantagens"
          : "decisao",
    );
    setEncerrando(true);
  };

  const confirmar = () => {
    if (!vencedorId) return;
    iniciarConfirmacao(async () => {
      await encerrarLutaDoPlacar(eventoId, chaveId, lutaId, vencedorId, metodo, {
        pontos1: lado1.pontos,
        vantagens1: lado1.vantagens,
        punicoes1: lado1.punicoes,
        pontos2: lado2.pontos,
        vantagens2: lado2.vantagens,
        punicoes2: lado2.punicoes,
      });
      router.refresh();
    });
  };

  // as duas linhas (cor fixa por atleta); o TROCAR LADOS só inverte a ordem.
  // Keys estáveis (a1/a2) preservam o estado ao reordenar.
  const linhas = [
    <LinhaAtleta
      key="a1"
      atleta={atleta1}
      dados={lado1}
      cor="bg-blue-700"
      grande={cheia}
      t={t}
      onAjustar={(campo, delta) => ajustar(1, campo, delta)}
    />,
    <LinhaAtleta
      key="a2"
      atleta={atleta2}
      dados={lado2}
      cor="bg-red-700"
      grande={cheia}
      t={t}
      onAjustar={(campo, delta) => ajustar(2, campo, delta)}
    />,
  ];

  return (
    <div className={cn(cheia && "flex min-h-0 flex-1 flex-col")}>
      <p className="truncate font-cond text-sm uppercase tracking-[0.06em] text-zinc-400">
        {categoriaNome}
      </p>

      <div className={cn("mt-2 flex flex-col gap-2 sm:gap-3", cheia && "min-h-0 flex-1")}>
        {trocado ? [linhas[1], linhas[0]] : linhas}
      </div>

      {/* barra inferior: trocar lados · cronômetro (play + ajustes) · encerrar */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-white sm:mt-3">
        <button
          onClick={() => setTrocado((v) => !v)}
          className="rounded-lg bg-white/10 px-4 py-2 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:bg-white/20"
        >
          {t.trocarLados}
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col gap-1">
            <BotaoTempo texto="+30" onClick={() => ajustarRelogio(30)} />
            <BotaoTempo texto="−30" onClick={() => ajustarRelogio(-30)} />
          </div>
          <div className="flex flex-col gap-1">
            <BotaoTempo texto="+1" onClick={() => ajustarRelogio(1)} />
            <BotaoTempo texto="−1" onClick={() => ajustarRelogio(-1)} />
          </div>
          <span
            className={cn(
              "font-cond font-bold tabular-nums leading-none tracking-tight",
              restante < 0 && "text-red-400",
              cheia ? "text-8xl" : "text-6xl sm:text-7xl",
            )}
          >
            {fmt(restante)}
          </span>
          <button
            onClick={alternarRelogio}
            aria-label={rodando ? t.pausar : t.iniciar}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30",
              cheia ? "h-16 w-16 text-2xl" : "h-14 w-14 text-xl",
            )}
          >
            {rodando ? "❚❚" : "▶"}
          </button>
          <button
            onClick={zerarRelogio}
            className="self-stretch rounded-lg bg-white/5 px-3 font-cond text-xs uppercase tracking-[0.04em] text-white/50 transition-colors hover:bg-white/15"
          >
            {t.zerar}
          </button>
        </div>

        <button
          onClick={abrirEncerramento}
          className="rounded-lg bg-emerald-600 px-5 py-2 font-medium transition-colors hover:bg-emerald-500"
        >
          {t.encerrarLuta}
        </button>
      </div>

      {encerrando && (
        <ModalEncerrar
          categoriaNome={categoriaNome}
          atleta1={atleta1}
          atleta2={atleta2}
          lado1={lado1}
          lado2={lado2}
          vencedorId={vencedorId}
          setVencedorId={setVencedorId}
          metodo={metodo}
          setMetodo={setMetodo}
          confirmando={confirmando}
          onConfirmar={confirmar}
          onFechar={() => !confirmando && setEncerrando(false)}
          t={t}
          met={met}
        />
      )}
    </div>
  );
}

/* Modal de encerramento — mesma linguagem do placar (escuro, cantos
   arredondados, lados azul × vermelho). Escolha do vencedor em cartões grandes
   e tocáveis + método em pílulas; confirma numa transition com spinner. */
function ModalEncerrar({
  categoriaNome,
  atleta1,
  atleta2,
  lado1,
  lado2,
  vencedorId,
  setVencedorId,
  metodo,
  setMetodo,
  confirmando,
  onConfirmar,
  onFechar,
  t,
  met,
}: {
  categoriaNome: string;
  atleta1: Props["atleta1"];
  atleta2: Props["atleta1"];
  lado1: Lado;
  lado2: Lado;
  vencedorId: string;
  setVencedorId: (id: string) => void;
  metodo: MetodoVitoria;
  setMetodo: (m: MetodoVitoria) => void;
  confirmando: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
  t: ReturnType<typeof useDic>["admin"]["placarTablet"];
  met: ReturnType<typeof useDic>["bracket"]["metodos"];
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4 animate-[fade-in_0.18s_ease]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-[min(760px,96vw)] overflow-y-auto rounded-3xl bg-zinc-900 text-white shadow-2xl ring-1 ring-white/10 animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="p-6 sm:p-8">
          {/* cabeçalho */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {t.encerrarLuta}
              </h2>
              <p className="mt-1 truncate text-sm text-zinc-400">
                {categoriaNome}
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              disabled={confirmando}
              aria-label={t.voltar}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.4">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* vencedor */}
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t.vencedor}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CartaoVencedor
              atleta={atleta1}
              dados={lado1}
              cor="bg-blue-700"
              selecionado={vencedorId === atleta1.id}
              onClick={() => setVencedorId(atleta1.id)}
              t={t}
            />
            <CartaoVencedor
              atleta={atleta2}
              dados={lado2}
              cor="bg-red-700"
              selecionado={vencedorId === atleta2.id}
              onClick={() => setVencedorId(atleta2.id)}
              t={t}
            />
          </div>

          {/* método */}
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t.metodo}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {METODOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                aria-pressed={metodo === m}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  metodo === m
                    ? "bg-white text-zinc-900"
                    : "bg-white/10 text-zinc-200 hover:bg-white/20",
                )}
              >
                {met[m]}
              </button>
            ))}
          </div>

          {/* ações */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onFechar}
              disabled={confirmando}
              className="flex-1 rounded-xl bg-white/10 py-3.5 text-sm font-semibold uppercase tracking-wide text-zinc-200 transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              {t.voltar}
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={!vencedorId || confirmando}
              aria-busy={confirmando}
              className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
            >
              {confirmando && <Spinner className="h-4 w-4" />}
              {confirmando ? t.confirmando : t.confirmarResultado}
            </button>
          </div>
        </div>
      </div>
    </div>,
    // em tela cheia, só a subárvore do elemento fullscreen renderiza — portal p/
    // ele (senão o modal de encerramento sumiria por trás do placar cheio)
    document.fullscreenElement ?? document.body,
  );
}

/* Cartão de escolha do vencedor — reflete a cor do lado (azul/vermelho) e o
   placar atual; dimmed quando não é o escolhido, com selo de check quando é. */
function CartaoVencedor({
  atleta,
  dados,
  cor,
  selecionado,
  onClick,
  t,
}: {
  atleta: Props["atleta1"];
  dados: Lado;
  cor: string;
  selecionado: boolean;
  onClick: () => void;
  t: ReturnType<typeof useDic>["admin"]["placarTablet"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={cn(
        "relative flex flex-col rounded-2xl p-5 text-left text-white transition-all",
        cor,
        selecionado
          ? "opacity-100 ring-4 ring-white ring-offset-2 ring-offset-zinc-900"
          : "opacity-45 hover:opacity-75",
      )}
    >
      {selecionado && (
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="truncate pr-9 text-xl font-bold sm:text-2xl">
        {atleta.nome}
      </span>
      {atleta.academia && (
        <span className="truncate text-sm opacity-70">{atleta.academia}</span>
      )}
      <div className="mt-3 flex items-end gap-3">
        <span className="text-5xl font-black leading-none tabular-nums">
          {dados.pontos}
        </span>
        <span className="mb-1 text-xs uppercase tracking-wide opacity-80">
          {t.vantagensLabel} {dados.vantagens} · {t.punicoesLabel} {dados.punicoes}
        </span>
      </div>
    </button>
  );
}
