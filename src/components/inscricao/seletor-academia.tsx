"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buscarAcademias, type AcademiaOpcao } from "@/lib/academias";
import { cn } from "@/lib/utils";

interface Props {
  /** nome do campo enviado no formulário (guarda o id da academia) */
  name?: string;
  defaultId?: string | null;
  defaultNome?: string | null;
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * Seletor de academia com busca. O atleta escolhe uma academia do catálogo
 * (base IBJJF) — não é possível digitar uma academia nova. O formulário
 * recebe apenas o id (`name`, padrão "academiaId"); enquanto nada é
 * selecionado, o valor enviado é vazio.
 */
export function SeletorAcademia({
  name = "academiaId",
  defaultId = null,
  defaultNome = null,
  required = false,
  className,
  id,
}: Props) {
  const reactId = useId();
  const inputId = id ?? `academia-${reactId}`;
  const listboxId = `${reactId}-lista`;

  const [texto, setTexto] = useState(defaultNome ?? "");
  const [selecionado, setSelecionado] = useState<AcademiaOpcao | null>(
    defaultId && defaultNome ? { id: defaultId, nome: defaultNome } : null,
  );
  const [resultados, setResultados] = useState<AcademiaOpcao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [destaque, setDestaque] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef(0);

  // apenas garante que nenhum timer de busca fique pendente ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function agendarBusca(valor: string) {
    const q = valor.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    reqRef.current++; // invalida respostas em voo
    if (q.length < 2) {
      setResultados([]);
      setCarregando(false);
      setAberto(false);
      return;
    }
    setCarregando(true);
    const req = reqRef.current;
    timerRef.current = setTimeout(async () => {
      try {
        const res = await buscarAcademias(q);
        if (req !== reqRef.current) return; // resposta obsoleta
        setResultados(res);
        setDestaque(0);
        setAberto(true);
      } catch {
        if (req === reqRef.current) setResultados([]);
      } finally {
        if (req === reqRef.current) setCarregando(false);
      }
    }, 200);
  }

  function aoDigitar(valor: string) {
    setTexto(valor);
    setSelecionado(null);
    agendarBusca(valor);
  }

  function escolher(opcao: AcademiaOpcao) {
    if (timerRef.current) clearTimeout(timerRef.current);
    reqRef.current++;
    setSelecionado(opcao);
    setTexto(opcao.nome);
    setResultados([]);
    setCarregando(false);
    setAberto(false);
  }

  function limpar() {
    if (timerRef.current) clearTimeout(timerRef.current);
    reqRef.current++;
    setSelecionado(null);
    setTexto("");
    setResultados([]);
    setCarregando(false);
    setAberto(false);
    inputRef.current?.focus();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto || resultados.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => (d + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => (d - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault(); // não envia o formulário ao escolher da lista
      const opcao = resultados[destaque];
      if (opcao) escolher(opcao);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  const q = texto.trim();
  const semResultado =
    !selecionado && !carregando && aberto && q.length >= 2 && resultados.length === 0;
  // sinaliza quando há texto digitado mas nenhuma academia escolhida
  const precisaSelecionar = !selecionado && q.length > 0 && !aberto;

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={selecionado?.id ?? ""} />
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listboxId}
          aria-autocomplete="list"
          required={required && !selecionado}
          placeholder="Digite para buscar sua academia"
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          onFocus={() => {
            if (!selecionado && resultados.length > 0) setAberto(true);
          }}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={aoTeclar}
          className={cn(
            "flex h-11 w-full border border-input bg-raised px-4 py-1 text-base transition-colors placeholder:text-muted-3 focus-visible:border-brand focus-visible:outline-none",
            selecionado ? "border-brand/60 pr-10" : "",
          )}
        />
        {selecionado && (
          <button
            type="button"
            onClick={limpar}
            aria-label="Limpar academia"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-3 transition-colors hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      <ul
        id={listboxId}
        role="listbox"
        hidden={!(aberto && (resultados.length > 0 || semResultado))}
        className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-input bg-raised py-1 shadow-lg"
      >
        {resultados.map((opcao, i) => (
          <li key={opcao.id} role="option" aria-selected={i === destaque}>
            <button
              type="button"
              // mousedown dispara antes do blur, preservando a escolha
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(opcao);
              }}
              onMouseEnter={() => setDestaque(i)}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm transition-colors",
                i === destaque ? "bg-brand text-white" : "text-text-2 hover:bg-brand/15",
              )}
            >
              {opcao.nome}
            </button>
          </li>
        ))}
        {semResultado && (
          <li className="px-4 py-2 text-sm text-muted-3">
            Nenhuma academia encontrada. Tente outro termo.
          </li>
        )}
      </ul>

      {precisaSelecionar && (
        <p className="mt-1 font-cond text-[12px] text-warning-foreground">
          Selecione uma academia da lista.
        </p>
      )}
    </div>
  );
}
