"use client";

import { useState } from "react";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { GRUPOS_PRECO_PRESETS } from "@/lib/lotes/preco";

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

/** "yyyy-mm-dd" → "dd/mm/aaaa" (sem passar por Date, evita fuso) */
function paraBR(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "—";
}

const labelCls =
  "font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-2";

const PRESETS = [7, 15, 30];

/** Formulário "Novo lote": presets de duração + preview ao vivo. */
export function NovoLote({
  criar,
  moeda,
}: {
  criar: (formData: FormData) => Promise<void>;
  moeda: string;
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [precoSegunda, setPrecoSegunda] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [variacoes, setVariacoes] = useState<{ nome: string; preco: string }[]>([]);

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda });
  const precoNum = Number(preco);

  // cada linha de variação é "completa" (nome + preço > 0) ou vazia — nada pela metade
  const variacoesOk = variacoes.every(
    (v) =>
      (!v.nome.trim() && !v.preco.trim()) ||
      (!!v.nome.trim() && Number(v.preco) > 0),
  );

  const valido =
    nome.trim() !== "" &&
    precoNum > 0 &&
    inicio !== "" &&
    fim !== "" &&
    fim >= inicio && // yyyy-mm-dd compara na ordem cronológica
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
      className="flex flex-col gap-[13px] border border-white/10 bg-surface p-[22px]"
    >
      <div className="disp mb-1 text-[26px]">Novo lote</div>

      <div className="flex flex-col gap-[7px]">
        <label className={labelCls} htmlFor="lote-nome">
          Nome
        </label>
        <Input
          id="lote-nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="1º lote / Early bird"
          className="h-10 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-[7px]">
          <label className={labelCls} htmlFor="lote-preco">
            Preço ({moeda})
          </label>
          <Input
            id="lote-preco"
            name="preco"
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="70,00"
            className="h-10 text-sm"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label className={labelCls} htmlFor="lote-preco2">
            2ª inscrição
          </label>
          <Input
            id="lote-preco2"
            name="precoSegunda"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={precoSegunda}
            onChange={(e) => setPrecoSegunda(e.target.value)}
            placeholder="opcional"
            className="h-10 text-sm"
          />
        </div>
      </div>

      {/* PACOTES DE PREÇO (VARIAÇÕES) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Pacotes de preço (opcional)</label>
          <button
            type="button"
            onClick={addVariacao}
            disabled={variacoes.length >= GRUPOS_PRECO_PRESETS.length}
            className="cursor-pointer border border-white/16 px-2.5 py-1 font-cond text-[12px] font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            + variação
          </button>
        </div>
        {variacoes.length === 0 ? (
          <p className="font-cond text-[12px] leading-snug text-muted-3">
            Preços diferentes por grupo (Kids, Adulto, Feminino…). Depois marque as
            categorias de cada grupo na aba Categorias.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {variacoes.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <NativeSelect
                  name="varNome"
                  value={v.nome}
                  onChange={(e) => setVariacao(i, "nome", e.target.value)}
                  className={`h-9 flex-1 text-sm ${v.nome ? "" : "text-muted-3"}`}
                >
                  <option value="">Grupo…</option>
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
                  placeholder="100,00"
                  className="h-9 w-24 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeVariacao(i)}
                  title="Remover variação"
                  className="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center border border-white/12 text-muted-3 transition-colors hover:border-brand/40 hover:text-brand"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-[7px]">
          <label className={labelCls} htmlFor="lote-inicio">
            Início
          </label>
          <Input
            id="lote-inicio"
            name="inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label className={labelCls} htmlFor="lote-fim">
            Fim
          </label>
          <Input
            id="lote-fim"
            name="fim"
            type="date"
            min={inicio || undefined}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="h-10 text-sm"
          />
        </div>
      </div>

      {/* PRESETS DE DURAÇÃO */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-cond text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-3">
          Duração
        </span>
        {PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => aplicarPreset(d)}
            className="border border-white/16 px-2.5 py-1.5 font-cond text-[12px] font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground"
          >
            +{d} dias
          </button>
        ))}
      </div>

      {/* PREVIEW AO VIVO */}
      <div className="border border-white/10 bg-background px-3.5 py-3">
        <div className="mb-1.5 font-cond text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-3">
          Prévia
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-cond text-[15px] font-semibold uppercase tracking-[0.03em]">
            {nome.trim() || "Novo lote"}
          </span>
          <span className="disp tnum shrink-0 text-xl text-brand-soft">
            {precoNum > 0 ? fmt.format(precoNum) : "—"}
          </span>
        </div>
        <div className="tnum mt-0.5 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
          {paraBR(inicio)} → {paraBR(fim)}
          {Number(precoSegunda) > 0 &&
            ` · 2ª ${fmt.format(Number(precoSegunda))}`}
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
        className="mt-1 flex h-[42px] cursor-pointer items-center justify-center bg-brand font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Adicionar lote
      </BotaoAcaoBruto>
    </form>
  );
}
