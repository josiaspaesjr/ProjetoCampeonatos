"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { bandeiraPais, nomePaisLocale } from "@/lib/paises";
import { useDic, useIdioma } from "@/lib/i18n/client";
import type { Dicionario } from "@/lib/i18n/dicionarios/pt";

/** strings da aba Atletas (usadas também no documento de impressão) */
type DicAtletas = Dicionario["atletas"];

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

/** dados do evento usados no cabeçalho da lista impressa */
export interface EventoResumo {
  nome: string;
  /** "Cidade · UF" (ou vazio) */
  local: string;
  /** data já formatada (pt-BR) */
  data: string;
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

/** escapa texto do usuário para interpolar com segurança no HTML de impressão */
const escaparHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

/**
 * Monta um documento HTML autocontido (tema claro, pronto para papel A4) com a
 * lista de atletas de uma academia — cabeçalho com marca/evento, resumo de
 * confirmados e tabela nº / atleta (com marcador de faixa) / categoria / país /
 * status. Todo texto do usuário passa por `escaparHtml`.
 */
function montarHtmlImpressao({
  grupo,
  evento,
  mostrarPais,
  locale,
  dat,
}: {
  grupo: GrupoAtletas;
  evento: EventoResumo;
  mostrarPais: boolean;
  locale: string;
  dat: DicAtletas;
}) {
  const { confirmados, pendentes } = contagem(grupo.atletas);

  const linhas = grupo.atletas
    .map((a, i) => {
      const ok = a.status === "confirmada";
      const celPais = mostrarPais
        ? `<td class="pais">${escaparHtml(nomePaisLocale(a.pais, locale))}</td>`
        : "";
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="nome"><span class="faixa" style="background:${corDaFaixa(a.faixa)}"></span>${escaparHtml(a.nome)}</td>
        <td class="cat">${escaparHtml(a.divisao)}</td>
        ${celPais}
        <td><span class="badge ${ok ? "ok" : "pend"}">${escaparHtml(ok ? dat.statusConfirmado : dat.statusPendente)}</span></td>
      </tr>`;
    })
    .join("");

  const thPais = mostrarPais ? `<th>${escaparHtml(dat.colPais)}</th>` : "";
  const legenda = [evento.nome, evento.data, evento.local]
    .filter(Boolean)
    .map(escaparHtml)
    .join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  const resumo =
    `${confirmados} ${escaparHtml(dat.confirmadosSelo)}` +
    (pendentes > 0
      ? `&nbsp;&nbsp;·&nbsp;&nbsp;${pendentes} ${escaparHtml(dat.pendentesSelo)}`
      : "");
  const geradoEm = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `<!doctype html>
<html lang="${escaparHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(grupo.titulo)} — ${escaparHtml(evento.nome)}</title>
<style>
  :root { --tinta:#18181b; --musgo:#6b7280; --linha:#e5e7eb; --marca:#ee2e24; }
  * { box-sizing:border-box; }
  html, body { margin:0; padding:0; }
  body {
    font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
    color:var(--tinta); padding:0 4mm;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  .barra { height:5px; background:var(--marca); margin:0 -4mm 22px; }
  .eyebrow { display:flex; justify-content:space-between; align-items:baseline; gap:16px; }
  .marca { font-size:12px; font-weight:800; letter-spacing:.14em; color:#9ca3af; text-transform:uppercase; }
  .marca b { color:var(--marca); }
  .rotulo { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#9ca3af; font-weight:700; }
  h1 { font-size:30px; font-weight:800; letter-spacing:-.01em; margin:10px 0 0; text-transform:uppercase; }
  .evento { margin-top:7px; font-size:12.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--musgo); }
  .resumo { margin-top:14px; display:inline-block; border:1px solid var(--tinta); padding:5px 12px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; margin-top:20px; }
  thead th { text-align:left; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--musgo); border-bottom:2px solid var(--tinta); padding:0 10px 9px; }
  th.num, td.num { width:34px; text-align:right; color:#9ca3af; }
  tbody td { padding:10px; border-bottom:1px solid var(--linha); font-size:13px; vertical-align:middle; }
  tbody tr:nth-child(even) td { background:#f8f8f8; }
  td.nome { font-weight:700; white-space:nowrap; }
  td.cat, td.pais { color:#3f3f46; font-size:12px; }
  .faixa { display:inline-block; width:13px; height:13px; margin-right:9px; vertical-align:-1px; border:1px solid #d4d4d8; transform:skewX(-9deg); }
  .badge { display:inline-block; font-size:10px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; padding:2px 8px; border:1px solid; white-space:nowrap; }
  .badge.ok { color:#047857; border-color:#a7f3d0; background:#ecfdf5; }
  .badge.pend { color:#b45309; border-color:#fde68a; background:#fffbeb; }
  footer { margin-top:26px; padding-top:12px; border-top:1px solid var(--linha); display:flex; justify-content:space-between; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:#9ca3af; }
  @page { size:A4; margin:14mm; }
  @media print { body { padding:0; } .barra { margin:0 0 22px; } }
</style>
</head>
<body>
  <div class="barra"></div>
  <div class="eyebrow">
    <span class="marca">BJJ<b>ARENA</b></span>
    <span class="rotulo">${escaparHtml(dat.listaAtletas)}</span>
  </div>
  <h1>${escaparHtml(grupo.titulo)}</h1>
  <div class="evento">${legenda}</div>
  <div class="resumo">${resumo}</div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>${escaparHtml(dat.colAtleta)}</th>
        <th>${escaparHtml(dat.colCategoria)}</th>
        ${thPais}
        <th>${escaparHtml(dat.colStatus)}</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <footer>
    <span>BJJARENA</span>
    <span>${escaparHtml(dat.geradoEm)} ${escaparHtml(geradoEm)}</span>
  </footer>
</body>
</html>`;
}

/** imprime um HTML autocontido via iframe oculto (sem popup, sem sair da página) */
function imprimirHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  let acionado = false;
  const acionar = () => {
    if (acionado) return;
    const win = iframe.contentWindow;
    if (!win) return;
    acionado = true;
    win.focus();
    win.print();
    win.onafterprint = () => iframe.remove();
    // rede de segurança: remove o iframe mesmo se onafterprint não disparar
    window.setTimeout(() => iframe.remove(), 60000);
  };

  iframe.onload = () => window.setTimeout(acionar, 60);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // fallback: em alguns navegadores o onload não dispara após document.write
  window.setTimeout(acionar, 400);
}

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
  evento,
  totalConfirmados,
  totalPendentes,
}: {
  divisoes: DivisaoAtletas[];
  evento: EventoResumo;
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
              evento={evento}
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
  evento,
  mostrarPais,
  forcarAberto,
}: {
  grupo: GrupoAtletas;
  modo: ModoAgrupamento;
  evento: EventoResumo;
  mostrarPais: boolean;
  /** força o grupo aberto (ex.: durante busca/filtro) ignorando o estado local */
  forcarAberto: boolean;
}) {
  const [abertoLocal, setAbertoLocal] = useState(false);
  const aberto = forcarAberto || abertoLocal;
  const { locale, dic } = useIdioma();
  const dat = dic.atletas;

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
        {modo === "academia" ? (
          <button
            type="button"
            onClick={() =>
              imprimirHtml(
                montarHtmlImpressao({ grupo, evento, mostrarPais, locale, dat }),
              )
            }
            className="flex shrink-0 items-center gap-1.5 font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
          >
            <IconeImprimir />
            {dat.imprimir}
          </button>
        ) : (
          grupo.chaveHref && (
            <Link
              href={grupo.chaveHref}
              className="shrink-0 font-cond text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-3 transition-colors hover:text-brand-soft"
            >
              {dat.verChave} →
            </Link>
          )
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

/** ícone de impressora no botão de imprimir a lista da academia */
function IconeImprimir() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
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
