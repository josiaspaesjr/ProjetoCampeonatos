"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { bandeiraPais, nomePaisLocale } from "@/lib/paises";
import { useDic, useIdioma } from "@/lib/i18n/client";

/** status relevante de um inscrito na lista pública */
export type StatusInscrito = "confirmada" | "pendente_pagamento";

export interface AtletaCard {
  id: string;
  nome: string;
  academia: string | null;
  /** nome da divisão (categoria) em que o atleta está inscrito */
  divisao: string;
  faixa: string;
  /** código ISO alpha-2 do país (ex.: "BR") */
  pais: string;
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

/** como os atletas estão agrupados na lista */
type ModoAgrupamento = "divisao" | "academia";

/** grupo genérico renderizado na lista — uma divisão OU uma academia */
interface GrupoAtletas {
  id: string;
  titulo: string;
  /** cor da faixa no cabeçalho (modo divisão); null no modo academia */
  faixa: string | null;
  confirmados: number;
  pendentes: number;
  /** link para a chave pública, quando publicada (só no modo divisão) */
  chaveHref: string | null;
  atletas: AtletaCard[];
}

/** normaliza para busca: minúsculas sem acento */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** conta confirmados/pendentes de uma lista de atletas */
function contagem(atletas: AtletaCard[]) {
  let confirmados = 0;
  for (const a of atletas) if (a.status === "confirmada") confirmados++;
  return { confirmados, pendentes: atletas.length - confirmados };
}

/** ordena atletas por nome no idioma ativo (sem mutar o array original) */
const porNome = (atletas: AtletaCard[], locale: string) =>
  [...atletas].sort((a, b) => a.nome.localeCompare(b.nome, locale));

/**
 * Aba **Atletas** pública: todos os inscritos, agrupados por **divisão**
 * (categoria) ou por **academia** — alternável pelo usuário. Card por atleta
 * com selo **Confirmado** (confirmada) / **Pendente** (pendente_pagamento) — o
 * atleta se inscreve e paga depois; só os confirmados entram nas áreas e
 * chaves. Tem busca (atleta/academia), filtro por país e atalho para a chave
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
  const [paisFiltro, setPaisFiltro] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoAgrupamento>("divisao");
  const q = norm(busca.trim());
  const { locale, dic } = useIdioma();
  const dat = dic.atletas;

  // países distintos presentes — só mostra o filtro/bandeiras se houver variedade
  const paises = useMemo(() => {
    const set = new Set<string>();
    for (const d of divisoes) for (const a of d.atletas) set.add(a.pais);
    return [...set].sort((a, b) =>
      nomePaisLocale(a, locale).localeCompare(nomePaisLocale(b, locale), locale),
    );
  }, [divisoes, locale]);
  const mostrarPais = paises.length > 1;

  // monta os grupos conforme o modo escolhido
  const grupos = useMemo<GrupoAtletas[]>(() => {
    if (modo === "divisao") {
      return divisoes.map((d) => ({
        id: d.categoriaId,
        titulo: d.titulo,
        faixa: d.faixa,
        confirmados: d.confirmados,
        pendentes: d.pendentes,
        chaveHref: d.chaveHref,
        atletas: d.atletas,
      }));
    }
    // por academia: achata todos os inscritos e reagrupa pelo nome da academia.
    // Os sem academia vão para um grupo à parte, sempre exibido por último.
    const porAcademia = new Map<string, AtletaCard[]>();
    const semAcademia: AtletaCard[] = [];
    for (const d of divisoes) {
      for (const a of d.atletas) {
        const nome = a.academia?.trim();
        if (!nome) {
          semAcademia.push(a);
          continue;
        }
        const arr = porAcademia.get(nome);
        if (arr) arr.push(a);
        else porAcademia.set(nome, [a]);
      }
    }

    const lista: GrupoAtletas[] = [...porAcademia.entries()]
      .map(([nome, atletas]) => {
        const ordenados = porNome(atletas, locale);
        return {
          id: `academia:${nome}`,
          titulo: nome,
          faixa: null,
          ...contagem(ordenados),
          chaveHref: null,
          atletas: ordenados,
        };
      })
      .sort((a, b) => a.titulo.localeCompare(b.titulo, locale));

    if (semAcademia.length) {
      const ordenados = porNome(semAcademia, locale);
      lista.push({
        id: "sem-academia",
        titulo: dat.semAcademia,
        faixa: null,
        ...contagem(ordenados),
        chaveHref: null,
        atletas: ordenados,
      });
    }
    return lista;
  }, [divisoes, modo, locale, dat.semAcademia]);

  const visiveis = useMemo(() => {
    if (!q && !paisFiltro) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        atletas: g.atletas.filter((a) => {
          if (paisFiltro && a.pais !== paisFiltro) return false;
          if (q && !norm(`${a.nome} ${a.academia ?? ""}`).includes(q))
            return false;
          return true;
        }),
      }))
      .filter((g) => g.atletas.length > 0);
  }, [grupos, q, paisFiltro]);

  const totalAtletas = totalConfirmados + totalPendentes;

  if (totalAtletas === 0) {
    return (
      <p className="font-cond text-sm uppercase tracking-[0.04em] text-muted-3">
        {dat.ninguemInscrito}
      </p>
    );
  }

  return (
    <>
      {/* RESUMO */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 font-cond text-[13px] uppercase tracking-[0.04em]">
        <span className="text-muted-2">
          <span className="tnum text-foreground">{totalAtletas}</span>{" "}
          {dat.inscritos}
        </span>
        <SeloContagem tone="ok">
          {totalConfirmados} {dat.confirmadosSelo}
        </SeloContagem>
        {totalPendentes > 0 && (
          <SeloContagem tone="pend">
            {totalPendentes} {dat.pendentesSelo}
          </SeloContagem>
        )}
      </div>

      {/* AGRUPAR POR: divisão | academia */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-cond text-[12px] uppercase tracking-[0.06em] text-muted-3">
          {dat.agruparPor}
        </span>
        <Chip ativo={modo === "divisao"} onClick={() => setModo("divisao")}>
          {dat.porDivisao}
        </Chip>
        <Chip ativo={modo === "academia"} onClick={() => setModo("academia")}>
          {dat.porAcademia}
        </Chip>
      </div>

      {/* BUSCA */}
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={dat.buscar}
        className="mb-3 w-full border border-white/14 bg-background px-4 py-2.5 font-cond text-[15px] uppercase tracking-[0.02em] text-foreground placeholder:text-muted-3 focus:border-brand focus:outline-none"
      />

      {/* FILTRO POR PAÍS (só quando há mais de um) */}
      {mostrarPais && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Chip ativo={paisFiltro === null} onClick={() => setPaisFiltro(null)}>
            {dat.todosPaises}
          </Chip>
          {paises.map((c) => (
            <Chip
              key={c}
              ativo={paisFiltro === c}
              onClick={() => setPaisFiltro(c)}
            >
              {bandeiraPais(c)} {nomePaisLocale(c, locale)}
            </Chip>
          ))}
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="border border-white/10 bg-surface px-6 py-12 text-center font-cond text-[14px] uppercase tracking-[0.04em] text-muted-3">
          {dat.nenhumEncontrado}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {visiveis.map((g) => (
            <Grupo
              key={g.id}
              grupo={g}
              modo={modo}
              mostrarPais={mostrarPais}
              forcarAberto={Boolean(q) || paisFiltro !== null}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Grupo({
  grupo,
  modo,
  mostrarPais,
  forcarAberto,
}: {
  grupo: GrupoAtletas;
  modo: ModoAgrupamento;
  mostrarPais: boolean;
  /** força o grupo aberto (ex.: durante busca/filtro) ignorando o estado local */
  forcarAberto: boolean;
}) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = forcarAberto || abertoLocal;
  const dat = useDic().atletas;

  return (
    <section className="relative border border-white/10 bg-surface">
      <span className="absolute inset-x-0 top-0 z-10 h-[3px] bg-brand" />

      {/* CABEÇALHO DO GRUPO — clique alterna o collapse (fechado por padrão) */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => setAbertoLocal((v) => !v)}
          aria-expanded={aberto}
          className="group flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          <Chevron aberto={aberto} />
          {modo === "academia" ? (
            <IconeAcademia />
          ) : (
            <span
              className="mt-0.5 h-3.5 w-3.5 shrink-0 -skew-x-9 border border-white/25"
              style={{ background: corDaFaixa(grupo.faixa) }}
            />
          )}
          <div className="min-w-0">
            <div className="truncate font-cond text-[15px] font-bold uppercase tracking-[0.02em] text-white">
              {grupo.titulo}
            </div>
            <div className="mt-0.5 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
              <span className="tnum">{grupo.confirmados}</span>{" "}
              {grupo.confirmados === 1 ? dat.confirmado : dat.confirmados}
              {grupo.pendentes > 0 && (
                <>
                  {" · "}
                  <span className="tnum">{grupo.pendentes}</span>{" "}
                  {grupo.pendentes === 1 ? dat.pendente : dat.pendentes}
                </>
              )}
            </div>
          </div>
        </button>
        {grupo.chaveHref && (
          <Link
            href={grupo.chaveHref}
            className="shrink-0 font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            {dat.verChave} →
          </Link>
        )}
      </div>

      {/* CARDS DOS ATLETAS */}
      {aberto && (
        <div className="grid grid-cols-1 gap-px border-t border-white/10 bg-white/6 sm:grid-cols-2 lg:grid-cols-3">
          {grupo.atletas.map((a) => (
            <CardAtleta
              key={a.id}
              atleta={a}
              modo={modo}
              mostrarPais={mostrarPais}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** seta que gira ao expandir (▶ fechado → ▼ aberto) */
function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0 text-muted-3 transition-transform duration-200 group-hover:text-brand-soft",
        aberto && "rotate-90",
      )}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** ícone de equipe no cabeçalho quando o grupo é uma academia */
function IconeAcademia() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CardAtleta({
  atleta,
  modo,
  mostrarPais,
}: {
  atleta: AtletaCard;
  modo: ModoAgrupamento;
  mostrarPais: boolean;
}) {
  const { locale, dic } = useIdioma();
  const dat = dic.atletas;
  // no modo academia o card mostra a divisão do atleta; caso contrário, a academia
  const linha =
    modo === "academia" ? atleta.divisao : (atleta.academia ?? dat.semAcademia);
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
            {mostrarPais && (
              <span className="mr-1" title={nomePaisLocale(atleta.pais, locale)}>
                {bandeiraPais(atleta.pais)}
              </span>
            )}
            {linha}
          </div>
        </div>
      </div>
      <StatusBadge status={atleta.status} />
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex -skew-x-9 items-center border px-3 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors",
        ativo
          ? "border-brand bg-brand text-white"
          : "border-white/14 text-muted-2 hover:border-brand/50 hover:text-brand-soft",
      )}
    >
      <span className="inline-block skew-x-9">{children}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: StatusInscrito }) {
  const dat = useDic().atletas;
  const confirmado = status === "confirmada";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 -skew-x-9 items-center border px-2 py-0.5 font-cond text-[10px] font-bold uppercase tracking-[0.06em]",
        confirmado
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/40 bg-amber-500/10 text-amber-400",
      )}
    >
      <span className="inline-block skew-x-9">
        {confirmado ? dat.statusConfirmado : dat.statusPendente}
      </span>
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
