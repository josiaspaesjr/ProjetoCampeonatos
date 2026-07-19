"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { AcaoTexto, BotaoAcao } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SeletorAcademia } from "@/components/inscricao/seletor-academia";
import { FAIXAS } from "@/lib/categorias/cbjj";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  cancelarInscricao,
  inscricaoManual,
  moverInscricao,
  reembolsarInscricao,
} from "./actions";

/** Linha da lista, já serializada pelo Server Component (sem PII crua além do
 *  que já aparece na tela). `busca` reúne os campos pesquisáveis num só texto. */
export interface LinhaInscricao {
  id: string;
  nome: string;
  status: string;
  categoriaId: string;
  categoriaNome: string;
  faixa: string;
  academiaNome: string | null;
  docLinha: string;
  busca: string;
}

export interface CategoriaAberta {
  id: string;
  nome: string;
}

const VARIANTE_STATUS: Record<string, BadgeProps["variant"]> = {
  pendente_pagamento: "warning",
  confirmada: "success",
  cancelada: "secondary",
  reembolsada: "secondary",
};

type Filtro = "todas" | "confirmadas" | "pendentes" | "inativas";

const ativos = new Set(["confirmada", "pendente_pagamento"]);

/** minúsculas sem acento, para busca tolerante a acentuação */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Painel de inscrições do organizador: barra com filtros por status + busca e
 * botão "Adicionar" (abre o modal de inscrição manual), seguida da lista
 * filtrada. Filtro e busca são client-side (resposta instantânea); as ações de
 * cada linha (mover/cancelar/reembolsar) continuam server actions.
 */
export function PainelInscricoes({
  eventoId,
  linhas,
  abertas,
}: {
  eventoId: string;
  linhas: LinhaInscricao[];
  abertas: CategoriaAberta[];
}) {
  const dic = useDic();
  const t = dic.admin.inscricoes;

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  const contagem = useMemo(() => {
    let confirmadas = 0;
    let pendentes = 0;
    let inativas = 0;
    for (const l of linhas) {
      if (l.status === "confirmada") confirmadas++;
      else if (l.status === "pendente_pagamento") pendentes++;
      else inativas++;
    }
    return { confirmadas, pendentes, inativas, total: linhas.length };
  }, [linhas]);

  const q = normalizar(busca.trim());
  const visiveis = useMemo(
    () =>
      linhas.filter((l) => {
        if (filtro === "confirmadas" && l.status !== "confirmada") return false;
        if (filtro === "pendentes" && l.status !== "pendente_pagamento") return false;
        if (filtro === "inativas" && ativos.has(l.status)) return false;
        if (q && !normalizar(l.busca).includes(q)) return false;
        return true;
      }),
    [linhas, filtro, q],
  );

  const chips: { id: Filtro; rotulo: string; n: number }[] = [
    { id: "todas", rotulo: t.filtroTodas, n: contagem.total },
    { id: "confirmadas", rotulo: t.filtroConfirmadas, n: contagem.confirmadas },
    { id: "pendentes", rotulo: t.filtroPendentes, n: contagem.pendentes },
    ...(contagem.inativas > 0
      ? [{ id: "inativas" as Filtro, rotulo: t.filtroInativas, n: contagem.inativas }]
      : []),
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const ativo = filtro === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFiltro(chip.id)}
                aria-pressed={ativo}
                className={cn(
                  "-skew-x-9 border px-3.5 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.05em] transition-colors",
                  ativo
                    ? "border-brand bg-brand text-white"
                    : "border-white/16 text-text-2 hover:border-white/30",
                )}
              >
                <span className="inline-block skew-x-9">
                  {chip.rotulo}
                  <span className={cn("ml-1.5", ativo ? "text-white/70" : "text-muted-3")}>
                    {chip.n}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 border border-white/16 bg-brand px-4 font-cond text-sm font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
        >
          <span aria-hidden className="text-base leading-none">
            +
          </span>
          {t.adicionar}
        </button>
      </div>

      <Input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={t.buscarPlaceholder}
      />

      <ul className="divide-y divide-border rounded-xl border bg-card">
        {visiveis.map((i) => {
          const rotulo = dic.admin.statusInscricao[i.status] ?? i.status;
          const variante = VARIANTE_STATUS[i.status] ?? ("outline" as const);
          const ativa = ativos.has(i.status);
          const faixaLabel =
            dic.evento.faixaNomes[i.faixa as keyof typeof dic.evento.faixaNomes] ??
            i.faixa;
          return (
            <li
              key={i.id}
              className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {i.nome}
                    <span className="ml-2 font-normal capitalize text-muted-foreground">
                      {faixaLabel}
                      {i.academiaNome ? ` · ${i.academiaNome}` : ""}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.categoriaNome}
                  </p>
                  {i.docLinha && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {i.docLinha}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 max-sm:w-full">
                <Badge variant={variante}>{rotulo}</Badge>

                {ativa && (
                  <form
                    action={moverInscricao.bind(null, eventoId, i.id)}
                    className="flex items-center gap-1 max-sm:flex-1"
                  >
                    <NativeSelect
                      name="categoriaId"
                      required
                      defaultValue=""
                      className="h-8 w-full text-xs sm:w-44"
                    >
                      <option value="" disabled>
                        {t.moverPara}
                      </option>
                      {abertas
                        .filter((c) => c.id !== i.categoriaId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                    </NativeSelect>
                    <BotaoAcao variant="outline" size="sm">
                      OK
                    </BotaoAcao>
                  </form>
                )}

                {i.status === "pendente_pagamento" && (
                  <form action={cancelarInscricao.bind(null, eventoId, i.id)}>
                    <AcaoTexto className="text-xs text-destructive hover:underline">
                      {t.cancelarAcao}
                    </AcaoTexto>
                  </form>
                )}
                {i.status === "confirmada" && (
                  <form action={reembolsarInscricao.bind(null, eventoId, i.id)}>
                    <AcaoTexto className="text-xs text-destructive hover:underline">
                      {t.reembolsar}
                    </AcaoTexto>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {visiveis.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            {linhas.length === 0 ? t.nenhumaAinda : t.nenhumResultado}
          </li>
        )}
      </ul>

      {modalAberto && (
        <ModalInscricaoManual
          eventoId={eventoId}
          abertas={abertas}
          aoFechar={() => setModalAberto(false)}
        />
      )}
    </section>
  );
}

/**
 * Modal de inscrição manual. A server action é chamada direto no `action` do
 * form (mantém o `useFormStatus` do botão de envio); no sucesso o modal fecha,
 * no erro fica aberto exibindo a mensagem. Fecha no Esc, no fundo e no × —
 * nunca durante o envio. Vai por portal no <body>.
 */
function ModalInscricaoManual({
  eventoId,
  abertas,
  aoFechar,
}: {
  eventoId: string;
  abertas: CategoriaAberta[];
  aoFechar: () => void;
}) {
  const dic = useDic();
  const t = dic.admin.inscricoes;
  const di = dic.inscricao;
  const c = dic.admin.comum;

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviandoRef = useRef(false);
  const tituloId = useId();

  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando]);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviandoRef.current) aoFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [aoFechar]);

  async function enviar(formData: FormData) {
    setErro(null);
    setEnviando(true);
    try {
      await inscricaoManual(eventoId, formData);
      aoFechar(); // sucesso: desmonta o modal (form reseta ao reabrir)
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : t.erroManual);
      setEnviando(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-black/60 animate-[fade-in_0.18s_ease]">
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !enviandoRef.current) aoFechar();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          className="relative w-[min(560px,95vw)] border border-white/10 bg-surface animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
        >
          <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />

          <div className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
            <div>
              <h2 id={tituloId} className="disp text-[24px] leading-none">
                {t.inscricaoManual}
              </h2>
              <p className="mt-2 text-xs leading-snug text-muted-2">{t.manualDesc}</p>
            </div>
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              aria-label={c.fechar}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-muted-3 transition-colors hover:text-foreground disabled:opacity-50"
            >
              <span aria-hidden className="text-2xl leading-none">
                ×
              </span>
            </button>
          </div>

          <form action={enviar} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input name="nome" required placeholder={di.nomeCompleto} />
              <Input name="email" type="email" required placeholder={di.email} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Input name="dataNascimento" type="date" required />
              <NativeSelect name="sexo" required defaultValue="">
                <option value="" disabled>
                  {di.sexo}
                </option>
                <option value="masculino">{di.masculino}</option>
                <option value="feminino">{di.feminino}</option>
              </NativeSelect>
              <NativeSelect name="faixa" required defaultValue="">
                <option value="" disabled>
                  {di.faixa}
                </option>
                {FAIXAS.map((f) => (
                  <option key={f} value={f}>
                    {dic.evento.faixaNomes[f as keyof typeof dic.evento.faixaNomes] ?? f}
                  </option>
                ))}
              </NativeSelect>
              <SeletorAcademia name="academiaId" />
            </div>
            <NativeSelect name="categoriaId" required defaultValue="">
              <option value="" disabled>
                {di.categoria}
              </option>
              {abertas.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </NativeSelect>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={aoFechar}
                disabled={enviando}
                className="inline-flex h-10 items-center justify-center border border-white/16 px-5 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-50"
              >
                {c.cancelar}
              </button>
              <BotaoAcao disabled={enviando}>{t.inscreverManualmente}</BotaoAcao>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
