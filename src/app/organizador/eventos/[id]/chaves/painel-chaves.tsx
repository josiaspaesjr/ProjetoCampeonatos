"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { NativeSelect } from "@/components/ui/native-select";
import { SeletorFormato } from "@/components/chaves/seletor-formato";
import { formatoAutomatico, type FormatoChaveId } from "@/lib/bracket";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { gerarChave, gerarChaveAuto } from "../../actions";

/** Uma categoria (com sua chave, se houver) serializada para o painel client. */
export interface LinhaChave {
  id: string;
  nome: string;
  classeIdade: string;
  faixa: string | null;
  sexo: string;
  qtd: number;
  /** status da chave, ou "sem_chave" quando ainda não foi gerada */
  statusKey: string;
  chave: {
    id: string;
    status: string;
    formato: FormatoChaveId;
    medalhasEntregues: boolean;
  } | null;
  /** texto pesquisável: nome da categoria + atletas + academias */
  busca: string;
}

const VARIANTE_CHAVE: Record<string, BadgeProps["variant"]> = {
  rascunho: "warning",
  publicada: "default",
  em_andamento: "outline",
  concluida: "success",
};

/** ordem dos chips de status (só os presentes são exibidos) */
const ORDEM_STATUS = [
  "sem_chave",
  "rascunho",
  "publicada",
  "em_andamento",
  "concluida",
];

const ordemClasse = new Map<string, number>(CLASSES_IDADE.map((c, i) => [c.id, i]));
const ordemFaixa = new Map<string, number>(FAIXAS.map((f, i) => [f, i]));

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Painel de chaves do organizador: filtros por status da chave e pelas
 * dimensões da categoria (classe, faixa, sexo — cada seletor só aparece quando
 * há mais de um valor), além de busca por nome da categoria **ou do atleta que
 * está na divisão**. Tudo client-side (instantâneo). As ações de cada linha
 * (gerar/regenerar/abrir) seguem sendo server actions.
 */
export function PainelChaves({
  eventoId,
  linhas,
}: {
  eventoId: string;
  linhas: LinhaChave[];
}) {
  const dic = useDic();
  const ch = dic.admin.chaves;

  const [status, setStatus] = useState("todas");
  const [classe, setClasse] = useState("");
  const [faixa, setFaixa] = useState("");
  const [sexo, setSexo] = useState("");
  const [busca, setBusca] = useState("");

  // valores presentes para montar chips/seletores (só aparecem se úteis)
  const { statusChips, classes, faixas, sexos } = useMemo(() => {
    const porStatus = new Map<string, number>();
    const cl = new Set<string>();
    const fx = new Set<string>();
    const sx = new Set<string>();
    for (const l of linhas) {
      porStatus.set(l.statusKey, (porStatus.get(l.statusKey) ?? 0) + 1);
      cl.add(l.classeIdade);
      if (l.faixa) fx.add(l.faixa);
      sx.add(l.sexo);
    }
    const statusChips = [
      { id: "todas", n: linhas.length },
      ...ORDEM_STATUS.filter((s) => porStatus.has(s)).map((s) => ({
        id: s,
        n: porStatus.get(s) ?? 0,
      })),
    ];
    const classes = [...cl].sort(
      (a, b) => (ordemClasse.get(a) ?? 99) - (ordemClasse.get(b) ?? 99),
    );
    const faixas = [...fx].sort(
      (a, b) => (ordemFaixa.get(a) ?? 99) - (ordemFaixa.get(b) ?? 99),
    );
    const sexos = [...sx];
    return { statusChips, classes, faixas, sexos };
  }, [linhas]);

  const q = normalizar(busca.trim());
  const visiveis = useMemo(
    () =>
      linhas.filter((l) => {
        if (status !== "todas" && l.statusKey !== status) return false;
        if (classe && l.classeIdade !== classe) return false;
        if (faixa && l.faixa !== faixa) return false;
        if (sexo && l.sexo !== sexo) return false;
        if (q && !normalizar(l.busca).includes(q)) return false;
        return true;
      }),
    [linhas, status, classe, faixa, sexo, q],
  );

  const rotuloStatus = (id: string) =>
    id === "todas"
      ? ch.filtrarTodas
      : id === "sem_chave"
        ? ch.semChave
        : (ch.status[id] ?? id);

  return (
    <section className="mt-6 space-y-4">
      {statusChips.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => {
            const ativo = status === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatus(chip.id)}
                aria-pressed={ativo}
                className={cn(
                  "-skew-x-9 border px-3.5 py-1.5 font-cond text-sm font-semibold uppercase tracking-[0.05em] transition-colors",
                  ativo
                    ? "border-brand bg-brand text-white"
                    : "border-white/16 text-text-2 hover:border-white/30",
                )}
              >
                <span className="inline-block skew-x-9">
                  {rotuloStatus(chip.id)}
                  <span className={cn("ml-1.5", ativo ? "text-white/70" : "text-muted-3")}>
                    {chip.n}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {classes.length > 1 && (
          <NativeSelect
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            aria-label={ch.filtroClasse}
            className="h-10 text-sm sm:w-auto"
          >
            <option value="">{ch.filtroClasse}</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {dic.classesIdade[c] ?? c}
              </option>
            ))}
          </NativeSelect>
        )}
        {faixas.length > 1 && (
          <NativeSelect
            value={faixa}
            onChange={(e) => setFaixa(e.target.value)}
            aria-label={ch.filtroFaixa}
            className="h-10 text-sm sm:w-auto"
          >
            <option value="">{ch.filtroFaixa}</option>
            {faixas.map((f) => (
              <option key={f} value={f}>
                {dic.evento.faixaNomes[f as keyof typeof dic.evento.faixaNomes] ?? f}
              </option>
            ))}
          </NativeSelect>
        )}
        {sexos.length > 1 && (
          <NativeSelect
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            aria-label={ch.filtroSexo}
            className="h-10 text-sm sm:w-auto"
          >
            <option value="">{ch.filtroSexo}</option>
            <option value="feminino">{dic.inscricao.feminino}</option>
            <option value="masculino">{dic.inscricao.masculino}</option>
          </NativeSelect>
        )}
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={ch.buscarPlaceholder}
          className="h-10 flex-1 border border-input bg-raised px-4 text-base transition-colors placeholder:text-muted-3 focus-visible:border-brand focus-visible:outline-none sm:min-w-[16rem]"
        />
      </div>

      <ul className="divide-y divide-border rounded-xl border bg-card">
        {visiveis.map((l) => {
          const rotulo = l.chave ? (ch.status[l.chave.status] ?? l.chave.status) : ch.semChave;
          const variante: BadgeProps["variant"] = l.chave
            ? (VARIANTE_CHAVE[l.chave.status] ?? "secondary")
            : "secondary";
          return (
            <li
              key={l.id}
              className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {l.qtd} {l.qtd === 1 ? ch.confirmadoSing : ch.confirmadoPlur}
                  {l.chave
                    ? ` · ${ch.formatos[l.chave.formato]?.nome ?? l.chave.formato}`
                    : l.qtd === 1
                      ? ` · ${ch.campeaoWo}`
                      : ` · ${ch.formatoSugerido} ${ch.formatos[formatoAutomatico()].nome}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 max-sm:w-full">
                <Badge variant={variante}>{rotulo}</Badge>
                {l.chave?.status === "concluida" && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      l.chave.medalhasEntregues
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning-foreground"
                    }`}
                  >
                    🏅{" "}
                    {l.chave.medalhasEntregues
                      ? ch.medalhasEntregues
                      : ch.medalhasPendentes}
                  </span>
                )}
                {l.qtd >= 2 &&
                  (!l.chave ||
                    l.chave.status === "rascunho" ||
                    l.chave.status === "publicada") && (
                    <SeletorFormato
                      acao={gerarChave.bind(null, eventoId, l.id)}
                      qtd={l.qtd}
                      regenerar={!!l.chave}
                      publicada={l.chave?.status === "publicada"}
                      formatoAtual={l.chave?.formato ?? null}
                    />
                  )}
                {l.qtd === 1 && !l.chave && (
                  <form action={gerarChaveAuto.bind(null, eventoId, l.id)}>
                    <BotaoAcao>{ch.gerarChave}</BotaoAcao>
                  </form>
                )}
                {l.chave && (
                  <Link
                    href={`/organizador/eventos/${eventoId}/chaves/${l.chave.id}`}
                    className="text-xs font-medium underline"
                  >
                    {ch.abrir}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
        {visiveis.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            {linhas.length === 0 ? ch.nenhumaCategoriaConfirmada : ch.nenhumaNoFiltro}
          </li>
        )}
      </ul>
    </section>
  );
}
