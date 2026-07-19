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
  // defasado nem depende de Date.now no render). O telão é quem espelha o tempo
  // rodando com precisão (CronometroTelao).
  const [restante, setRestante] = useState(
    cronometroInicial?.restanteSeg ?? duracaoSegundos,
  );
  const [rodando, setRodando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [metodo, setMetodo] = useState<MetodoVitoria>("pontos");
  const [vencedorId, setVencedorId] = useState<string>("");
  const [, startTransition] = useTransition();
  const [confirmando, iniciarConfirmacao] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const Coluna = ({
    lado,
    atleta,
    dados,
    cor,
  }: {
    lado: 1 | 2;
    atleta: Props["atleta1"];
    dados: Lado;
    cor: string;
  }) => (
    <div className={`flex-1 rounded-2xl p-6 text-white ${cor}`}>
      <p className="truncate text-2xl font-bold">{atleta.nome}</p>
      <p className="truncate text-sm opacity-70">{atleta.academia ?? ""}</p>

      <div className="mt-4 flex items-end gap-6">
        <span className="text-6xl font-black tabular-nums sm:text-8xl">{dados.pontos}</span>
        <div className="mb-2 space-y-1 text-sm">
          <p>{t.vantagensLabel}: <span className="font-bold">{dados.vantagens}</span></p>
          <p>{t.punicoesLabel}: <span className="font-bold">{dados.punicoes}</span></p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => ajustar(lado, "pontos", n)}
            className="rounded-xl bg-white/20 py-4 text-xl font-bold hover:bg-white/30"
          >
            +{n}
          </button>
        ))}
        <button onClick={() => ajustar(lado, "pontos", -1)} className="rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
          {t.menos1Ponto}
        </button>
        <button onClick={() => ajustar(lado, "vantagens", 1)} className="rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
          {t.maisVantagem}
        </button>
        <button onClick={() => ajustar(lado, "punicoes", 1)} className="rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
          {t.maisPunicao}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-zinc-900 px-4 py-4 text-white sm:px-6">
        <p className="w-full truncate text-sm text-zinc-300 sm:w-auto">{categoriaNome}</p>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className={`font-cond text-3xl font-bold tabular-nums sm:text-4xl ${restante < 0 ? "text-red-400" : ""}`}>
            {fmt(restante)}
          </span>
          <button
            onClick={alternarRelogio}
            className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
          >
            {rodando ? t.pausar : t.iniciar}
          </button>
          <button
            onClick={zerarRelogio}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          >
            {t.zerar}
          </button>
        </div>
        <button
          onClick={abrirEncerramento}
          className="rounded-lg bg-emerald-600 px-5 py-2 font-medium hover:bg-emerald-500"
        >
          {t.encerrarLuta}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Coluna lado={1} atleta={atleta1} dados={lado1} cor="bg-blue-700" />
        <Coluna lado={2} atleta={atleta2} dados={lado2} cor="bg-red-700" />
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
    document.body,
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
