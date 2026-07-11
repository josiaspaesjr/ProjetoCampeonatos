"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MetodoVitoria } from "@/lib/bracket";
import {
  encerrarLutaDoPlacar,
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
}

interface Lado {
  pontos: number;
  vantagens: number;
  punicoes: number;
}

const zerado: Lado = { pontos: 0, vantagens: 0, punicoes: 0 };

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
}: Props) {
  const router = useRouter();
  const [placar, setPlacar] = useState<{ l1: Lado; l2: Lado }>(
    placarInicial ?? { l1: zerado, l2: zerado },
  );
  const lado1 = placar.l1;
  const lado2 = placar.l2;
  const [restante, setRestante] = useState(duracaoSegundos);
  const [rodando, setRodando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [metodo, setMetodo] = useState<MetodoVitoria>("pontos");
  const [vencedorId, setVencedorId] = useState<string>("");
  const [, startTransition] = useTransition();
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

  const abrirEncerramento = () => {
    setRodando(false);
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

  const confirmar = async () => {
    if (!vencedorId) return;
    await encerrarLutaDoPlacar(eventoId, chaveId, lutaId, vencedorId, metodo, {
      pontos1: lado1.pontos,
      vantagens1: lado1.vantagens,
      punicoes1: lado1.punicoes,
      pontos2: lado2.pontos,
      vantagens2: lado2.vantagens,
      punicoes2: lado2.punicoes,
    });
    router.refresh();
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
          <p>Vantagens: <span className="font-bold">{dados.vantagens}</span></p>
          <p>Punições: <span className="font-bold">{dados.punicoes}</span></p>
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
          −1 ponto
        </button>
        <button onClick={() => ajustar(lado, "vantagens", 1)} className="rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
          +Vantagem
        </button>
        <button onClick={() => ajustar(lado, "punicoes", 1)} className="rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
          +Punição
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
            onClick={() => setRodando((r) => !r)}
            className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
          >
            {rodando ? "Pausar" : "Iniciar"}
          </button>
          <button
            onClick={() => { setRodando(false); setRestante(duracaoSegundos); }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          >
            Zerar
          </button>
        </div>
        <button
          onClick={abrirEncerramento}
          className="rounded-lg bg-emerald-600 px-5 py-2 font-medium hover:bg-emerald-500"
        >
          Encerrar luta
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Coluna lado={1} atleta={atleta1} dados={lado1} cor="bg-blue-700" />
        <Coluna lado={2} atleta={atleta2} dados={lado2} cor="bg-red-700" />
      </div>

      {encerrando && (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="font-bold">Confirmar resultado</p>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vencedor"
                checked={vencedorId === atleta1.id}
                onChange={() => setVencedorId(atleta1.id)}
              />
              {atleta1.nome}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vencedor"
                checked={vencedorId === atleta2.id}
                onChange={() => setVencedorId(atleta2.id)}
              />
              {atleta2.nome}
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoVitoria)}
              className="rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="pontos">Pontos</option>
              <option value="vantagens">Vantagens</option>
              <option value="finalizacao">Finalização</option>
              <option value="decisao">Decisão</option>
              <option value="wo">W.O.</option>
              <option value="dq">Desqualificação</option>
            </select>
            <button
              onClick={confirmar}
              disabled={!vencedorId}
              className="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-300"
            >
              Confirmar
            </button>
            <button onClick={() => setEncerrando(false)} className="text-zinc-500 hover:underline">
              voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
