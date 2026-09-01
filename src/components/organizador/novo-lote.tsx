"use client";

import { useState } from "react";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { GRUPOS_PRECO_PRESETS } from "@/lib/lotes/preco";
import { loteConflitante, ymdParaBR, type JanelaLote } from "@/lib/lotes/vigencia";
import { useDic } from "@/lib/i18n/client";

const p2 = (n: number) => String(n).padStart(2, "0");

/** hoje como "yyyy-mm-dd" (horário local) */
function hojeYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** soma dias a um "yyyy-mm-dd" e devolve "yyyy-mm-dd" */
function somaDias(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}`;
}

const labelCls =
  "font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-2";

const PRESETS = [7, 15, 30];

/** Formulário "Novo lote": presets de duração + preview ao vivo. */
export function NovoLote({
  criar,
  moeda,
  lotesExistentes,
}: {
  criar: (formData: FormData) => Promise<void>;
  moeda: string;
  lotesExistentes: JanelaLote[];
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [precoSegunda, setPrecoSegunda] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [variacoes, setVariacoes] = useState<{ nome: string; preco: string }[]>([]);
  const dic = useDic();
  const nl = dic.admin.novoLote;

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda });
  const precoNum = Number(preco);

  // cada linha de variação é "completa" (nome + preço > 0) ou vazia — nada pela metade
  const variacoesOk = variacoes.every(
    (v) =>
      (!v.nome.trim() && !v.preco.trim()) ||
      (!!v.nome.trim() && Number(v.preco) > 0),
  );

  // o período não pode cair dentro do de outro lote (datas se sobrepondo)
  const conflito = loteConflitante({ inicio, fim }, lotesExistentes);
  const conflitoVisivel = inicio !== "" && fim !== "" && fim >= inicio && !!conflito;

  const valido =
    nome.trim() !== "" &&
    precoNum > 0 &&
    inicio !== "" &&
    fim !== "" &&
    fim >= inicio && // yyyy-mm-dd compara na ordem cronológica
    !conflito &&
    variacoesOk;

  const addVariacao = () => setVariacoes((vs) => [...vs, { nome: "", preco: "" }]);
  const removeVariacao = (i: number) =>
    setVariacoes((vs) => vs.filter((_, j) => j !== i));
  const setVariacao = (i: number, campo: "nome" | "preco", valor: string) =>
    setVariacoes((vs) => vs.map((v, j) => (j === i ? { ...v, [campo]: valor } : v)));

  const variacoesPreview = variacoes.filter(
    (v) => v.nome.trim() && Number(v.preco) > 0,
  );

  function limpar() {
    setNome("");
    setPreco("");
    setPrecoSegunda("");
    setInicio("");
    setFim("");
    setVariacoes([]);
  }

  function aplicarPreset(dias: number) {
    setFim(somaDias(inicio || hojeYmd(), dias));
  }

  return (
    <form
      action={async (fd) => {
        await criar(fd);
        limpar();
      }}
      className="border border-white/10 bg-surface p-[22px]"
    >
      <div className="disp mb-4 text-[26px]">{nl.titulo}</div>

      {/* CAMPOS PRINCIPAIS — em telas largas os cinco cabem numa linha só */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,1fr))]">
        <Campo id="lote-nome" rotulo={nl.nome}>
          <Input
            id="lote-nome"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={nl.nomePlaceholder}
            className="h-10 text-sm"
          />
        </Campo>

        <Campo id="lote-preco" rotulo={`${nl.preco} (${moeda})`}>
          <Input
            id="lote-preco"
            name="preco"
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder={nl.precoPlaceholder}
            className="h-10 text-sm"
          />
        </Campo>

        <Campo id="lote-preco2" rotulo={nl.segundaInscricao}>
          <Input
            id="lote-preco2"
            name="precoSegunda"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={precoSegunda}
            onChange={(e) => setPrecoSegunda(e.target.value)}
            placeholder={nl.opcional}
            className="h-10 text-sm"
          />
        </Campo>

        <Campo id="lote-inicio" rotulo={nl.inicio}>
          <Input
            id="lote-inicio"
            name="inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="h-10 text-sm"
          />
        </Campo>

        <Campo id="lote-fim" rotulo={nl.fim}>
          <Input
            id="lote-fim"
            name="fim"
            type="date"
            min={inicio || undefined}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="h-10 text-sm"
          />
        </Campo>
      </div>

      {/* PRESETS DE DURAÇÃO — no xl encostam à direita, sob as datas que preenchem */}
      <div className="mt-3 flex flex-wrap items-center gap-2 xl:justify-end">
        <span className="font-cond text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-3">
          {nl.duracao}
        </span>
        {PRESETS.map((dur) => (
          <button
            key={dur}
            type="button"
            onClick={() => aplicarPreset(dur)}
            className="border border-white/16 px-2.5 py-1.5 font-cond text-[12px] font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground"
          >
            +{dur} {dic.admin.lotes.dias}
          </button>
        ))}
      </div>

      {conflitoVisivel && conflito && (
        <p className="mt-3 border border-brand/50 bg-brand/10 px-3 py-2 font-cond text-[12px] leading-snug text-brand-soft">
          {nl.conflitoPre}{" "}
          <span className="font-semibold uppercase">{conflito.nome}</span> (
          {ymdParaBR(conflito.inicio)} → {ymdParaBR(conflito.fim)}).{" "}
          {nl.conflitoPos}
        </p>
      )}

      {/* PACOTES DE PREÇO (esq.) + PRÉVIA E ENVIO (dir.) */}
      <div className="mt-5 grid gap-5 border-t border-white/8 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <label className={labelCls}>{nl.pacotesPreco}</label>
            <button
              type="button"
              onClick={addVariacao}
              disabled={variacoes.length >= GRUPOS_PRECO_PRESETS.length}
              className="cursor-pointer border border-white/16 px-2.5 py-1 font-cond text-[12px] font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {nl.addVariacao}
            </button>
          </div>
          {variacoes.length === 0 ? (
            <p className="font-cond text-[12px] leading-snug text-muted-3">
              {nl.variacaoHelp}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {variacoes.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <NativeSelect
                    name="varNome"
                    value={v.nome}
                    onChange={(e) => setVariacao(i, "nome", e.target.value)}
                    className={`h-9 min-w-0 flex-1 text-sm ${v.nome ? "" : "text-muted-3"}`}
                  >
                    <option value="">{nl.grupo}</option>
                    {GRUPOS_PRECO_PRESETS.filter(
                      (p) =>
                        p === v.nome ||
                        !variacoes.some((x, j) => j !== i && x.nome === p),
                    ).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    name="varPreco"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={v.preco}
                    onChange={(e) => setVariacao(i, "preco", e.target.value)}
                    placeholder={nl.varPrecoPlaceholder}
                    className="h-9 w-24 shrink-0 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariacao(i)}
                    title={nl.removerVariacao}
                    className="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center border border-white/12 text-muted-3 transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* PREVIEW AO VIVO */}
          <div className="border border-white/10 bg-background px-3.5 py-3">
            <div className="mb-1.5 font-cond text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-3">
              {nl.previa}
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-cond text-[15px] font-semibold uppercase tracking-[0.03em]">
                {nome.trim() || nl.titulo}
              </span>
              <span className="disp tnum shrink-0 text-xl text-brand-soft">
                {precoNum > 0 ? fmt.format(precoNum) : "—"}
              </span>
            </div>
            <div className="tnum mt-0.5 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
              {ymdParaBR(inicio)} → {ymdParaBR(fim)}
              {Number(precoSegunda) > 0 &&
                ` · ${nl.segundaAbrev} ${fmt.format(Number(precoSegunda))}`}
            </div>
            {variacoesPreview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {variacoesPreview.map((v, i) => (
                  <span
                    key={i}
                    className="tnum inline-flex items-center gap-1 border border-white/12 bg-surface px-2 py-0.5 font-cond text-[12px] uppercase tracking-[0.03em] text-text-2"
                  >
                    {v.nome.trim()}
                    <span className="text-brand-soft">{fmt.format(Number(v.preco))}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <BotaoAcaoBruto
            disabled={!valido}
            className="flex h-[42px] cursor-pointer items-center justify-center bg-brand font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nl.adicionarLote}
          </BotaoAcaoBruto>
        </div>
      </div>
    </form>
  );
}

/** Rótulo + campo, empilhados. Só para não repetir a mesma casca cinco vezes. */
function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <label className={labelCls} htmlFor={id}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}
