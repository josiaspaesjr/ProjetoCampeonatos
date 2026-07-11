"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";

/** status relevante de um inscrito na lista pública */
export type StatusInscrito = "confirmada" | "pendente_pagamento";

export interface AtletaCard {
  id: string;
  nome: string;
  academia: string | null;
  faixa: string;
  status: StatusInscrito;
}

export interface DivisaoAtletas {
  categoriaId: string;
  titulo: string;
  faixa: string | null;
  confirmados: number;
  pendentes: number;
  /** link para a chave pública, quando publicada */
  chaveHref: string | null;
  atletas: AtletaCard[];
}

/** normaliza para busca: minúsculas sem acento */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Aba **Atletas** pública: todos os inscritos agrupados por divisão (categoria),
 * com card por atleta e selo **Pago** (confirmada) / **Pendente**
 * (pendente_pagamento) — o atleta se inscreve e paga depois; só os confirmados
 * entram nas áreas e chaves. Tem busca (atleta/academia) e atalho para a chave
 * de cada categoria quando ela já está publicada.
 */
export function AtletasLista({
  divisoes,
  totalConfirmados,
  totalPendentes,
}: {
  divisoes: DivisaoAtletas[];
  totalConfirmados: number;
  totalPendentes: number;
}) {
  const [busca, setBusca] = useState("");
  const q = norm(busca.trim());

  const visiveis = useMemo(() => {
    if (!q) return divisoes;
    return divisoes
      .map((d) => ({
        ...d,
        atletas: d.atletas.filter((a) =>
          norm(`${a.nome} ${a.academia ?? ""}`).includes(q),
        ),
      }))
      .filter((d) => d.atletas.length > 0);
  }, [divisoes, q]);

  const totalAtletas = totalConfirmados + totalPendentes;

  if (totalAtletas === 0) {
    return (
      <p className="font-cond text-sm uppercase tracking-[0.04em] text-muted-3">
        Ninguém inscrito ainda — os atletas aparecem aqui assim que as inscrições
        começarem.
      </p>
    );
  }

  return (
    <>
      {/* RESUMO */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 font-cond text-[13px] uppercase tracking-[0.04em]">
        <span className="text-muted-2">
          <span className="tnum text-foreground">{totalAtletas}</span> inscritos
        </span>
        <SeloContagem tone="ok">{totalConfirmados} confirmados</SeloContagem>
        {totalPendentes > 0 && (
          <SeloContagem tone="pend">{totalPendentes} pendentes</SeloContagem>
        )}
      </div>

      {/* BUSCA */}
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar atleta ou academia…"
        className="mb-5 w-full border border-white/14 bg-background px-4 py-2.5 font-cond text-[15px] uppercase tracking-[0.02em] text-foreground placeholder:text-muted-3 focus:border-brand focus:outline-none"
      />

      {visiveis.length === 0 ? (
        <div className="border border-white/10 bg-surface px-6 py-12 text-center font-cond text-[14px] uppercase tracking-[0.04em] text-muted-3">
          Nenhum atleta encontrado
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {visiveis.map((d) => (
            <Divisao key={d.categoriaId} divisao={d} />
          ))}
        </div>
      )}
    </>
  );
}

function Divisao({ divisao }: { divisao: DivisaoAtletas }) {
  return (
    <section className="relative border border-white/10 bg-surface">
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* CABEÇALHO DA DIVISÃO */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="mt-1 h-3.5 w-3.5 shrink-0 -skew-x-9 border border-white/25"
            style={{ background: corDaFaixa(divisao.faixa) }}
          />
          <div className="min-w-0">
            <div className="truncate font-cond text-[15px] font-bold uppercase tracking-[0.02em] text-white">
              {divisao.titulo}
            </div>
            <div className="mt-0.5 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
              <span className="tnum">{divisao.confirmados}</span> confirmado
              {divisao.confirmados === 1 ? "" : "s"}
              {divisao.pendentes > 0 && (
                <>
                  {" · "}
                  <span className="tnum">{divisao.pendentes}</span> pendente
                  {divisao.pendentes === 1 ? "" : "s"}
                </>
              )}
            </div>
          </div>
        </div>
        {divisao.chaveHref && (
          <Link
            href={divisao.chaveHref}
            className="shrink-0 font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            Ver chave →
          </Link>
        )}
      </div>

      {/* CARDS DOS ATLETAS */}
      <div className="grid grid-cols-1 gap-px bg-white/6 sm:grid-cols-2 lg:grid-cols-3">
        {divisao.atletas.map((a) => (
          <CardAtleta key={a.id} atleta={a} />
        ))}
      </div>
    </section>
  );
}

function CardAtleta({ atleta }: { atleta: AtletaCard }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-3 w-3 shrink-0 -skew-x-9 border border-white/25"
          style={{ background: corDaFaixa(atleta.faixa) }}
        />
        <div className="min-w-0">
          <div className="truncate font-cond text-[15px] font-semibold uppercase tracking-[0.01em] text-foreground">
            {atleta.nome}
          </div>
          <div className="truncate font-cond text-[12px] uppercase tracking-[0.03em] text-muted-3">
            {atleta.academia ?? "Sem academia"}
          </div>
        </div>
      </div>
      <StatusBadge status={atleta.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: StatusInscrito }) {
  const pago = status === "confirmada";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 -skew-x-9 items-center border px-2 py-0.5 font-cond text-[10px] font-bold uppercase tracking-[0.06em]",
        pago
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/40 bg-amber-500/10 text-amber-400",
      )}
    >
      <span className="inline-block skew-x-9">{pago ? "Pago" : "Pendente"}</span>
    </span>
  );
}

function SeloContagem({
  tone,
  children,
}: {
  tone: "ok" | "pend";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex -skew-x-9 items-center border px-2.5 py-1 font-cond text-[12px] font-semibold uppercase tracking-[0.04em]",
        tone === "ok"
          ? "border-emerald-500/40 text-emerald-400"
          : "border-amber-500/40 text-amber-400",
      )}
    >
      <span className="inline-block skew-x-9">{children}</span>
    </span>
  );
}
