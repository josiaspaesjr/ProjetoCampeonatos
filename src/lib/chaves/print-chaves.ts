/**
 * Geração do HTML imprimível de TODAS as chaves de um evento — função pura (sem
 * React, sem DB), para o botão "Imprimir chaves" e para teste. Uma chave por
 * página (A4 paisagem, tema claro): o bracket em colunas por rodada, caixas de
 * confronto, vencedor em negrito e campeão destacado. Round robin/dupla/colocação
 * saem na sua estrutura. Reaproveita `escaparHtml`, `corDaFaixa`, `idsDeBye` e
 * `classificarEliminacaoDupla` (mesmas regras da chave na tela).
 */

import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { escaparHtml } from "@/lib/print";
import { idsDeBye } from "@/lib/chaves/byes";
import { classificarEliminacaoDupla } from "@/lib/chaves/eliminacao-dupla";
import type { BracketLabels } from "@/components/bracket-view";

/** luta serializada p/ impressão (nomes de campo do banco → helpers reusáveis) */
export interface LutaImpressao {
  id: string;
  rodada: number;
  posicao: number;
  fase: string | null;
  atleta1InscricaoId: string | null;
  atleta2InscricaoId: string | null;
  vencedorInscricaoId: string | null;
  proximaLutaId: string | null;
  proximaLutaSlot: number | null;
  proximaLutaPerdedorId: string | null;
  proximaLutaPerdedorSlot: number | null;
  metodo: string | null;
  nomeFinalizacao: string | null;
}

export interface ChaveImpressao {
  id: string;
  categoriaNome: string;
  faixa: string | null;
  formato: string;
  lutas: LutaImpressao[];
}

export interface AtletaImpressao {
  nome: string;
  academia: string | null;
}

export interface OpcoesImpressaoChaves {
  titulo: string;
  eventoNome: string;
  geradoEmRotulo: string;
  geradoEm: string;
  formatoNome: (formato: string) => string;
  L: BracketLabels;
}

/** dois primeiros nomes — mantém a caixa compacta, igual à chave na tela */
const doisNomes = (n: string) => n.trim().split(/\s+/).slice(0, 2).join(" ");

/** rótulo da rodada contado a partir da final (igual ao bracket-view) */
function rotuloRodada(
  rodada: number,
  total: number,
  formato: string,
  L: BracketLabels,
): string {
  const generico = `${L.rodadaPre}${rodada}${L.rodadaPos}`;
  if (formato === "round_robin") return generico;
  const doFim = total - rodada;
  if (doFim === 0) return L.final;
  if (doFim === 1) return L.semifinal;
  if (doFim === 2) return L.quartas;
  if (doFim === 3) return L.oitavas;
  return generico;
}

/** documento HTML autocontido (A4 paisagem, tema claro) com todas as chaves */
export function montarHtmlChaves(
  chaves: ChaveImpressao[],
  atletas: Record<string, AtletaImpressao>,
  o: OpcoesImpressaoChaves,
): string {
  const { L } = o;

  const linhaAtleta = (id: string | null, venc: string | null, bye: boolean) => {
    if (!id) {
      const txt = bye ? L.bye : L.aguardando;
      return `<div class="atl vazio">${escaparHtml(txt)}</div>`;
    }
    const info = atletas[id];
    const ganhou = venc === id;
    const perdeu = venc != null && !ganhou;
    const nome = info ? escaparHtml(doisNomes(info.nome)) : "?";
    const ac = info?.academia
      ? `<div class="ac">${escaparHtml(info.academia)}</div>`
      : "";
    return `<div class="atl${ganhou ? " venc" : ""}${perdeu ? " perd" : ""}">${nome}${ac}</div>`;
  };

  const caixaLuta = (l: LutaImpressao, bye: boolean) => {
    const met =
      l.vencedorInscricaoId && l.metodo
        ? `<div class="met">${escaparHtml(L.metodos[l.metodo] ?? l.metodo)}${
            l.nomeFinalizacao ? ` — ${escaparHtml(l.nomeFinalizacao)}` : ""
          }</div>`
        : "";
    return `<div class="luta">
      ${linhaAtleta(l.atleta1InscricaoId, l.vencedorInscricaoId, bye)}
      ${linhaAtleta(l.atleta2InscricaoId, l.vencedorInscricaoId, bye)}
      ${met}
    </div>`;
  };

  /** colunas de rodada (bracket) de um conjunto de lutas */
  const colunas = (
    lutas: LutaImpressao[],
    byes: Set<string>,
    rotulo: (rodada: number, total: number) => string,
  ) => {
    const rodadas = [...new Set(lutas.map((l) => l.rodada))].sort((a, b) => a - b);
    const total = rodadas.length ? Math.max(...rodadas) : 0;
    const cols = rodadas
      .map((r) => {
        const daR = lutas
          .filter((l) => l.rodada === r && !byes.has(l.id))
          .sort((a, b) => a.posicao - b.posicao);
        if (!daR.length) return "";
        const cells = daR
          .map((l) => `<div class="cell">${caixaLuta(l, byes.has(l.id))}</div>`)
          .join("");
        return `<div class="round"><div class="rt">${escaparHtml(
          rotulo(r, total),
        )}</div><div class="cells">${cells}</div></div>`;
      })
      .filter(Boolean)
      .join("");
    return `<div class="bracket">${cols}</div>`;
  };

  const campeaoBox = (id: string | null | undefined) => {
    if (!id) return "";
    const nome = atletas[id] ? escaparHtml(doisNomes(atletas[id].nome)) : "?";
    return `<div class="campeao">🏆 ${escaparHtml(L.campeao)}: <b>${nome}</b></div>`;
  };

  const corpoChave = (chave: ChaveImpressao): string => {
    const { formato, lutas } = chave;
    if (!lutas.length) return "";

    if (formato === "eliminacao_dupla") {
      const { mortas } = classificarEliminacaoDupla(lutas);
      const byes = new Set(
        lutas
          .filter(
            (l) =>
              l.vencedorInscricaoId != null &&
              (l.atleta1InscricaoId == null) !== (l.atleta2InscricaoId == null),
          )
          .map((l) => l.id),
      );
      const vivas = lutas.filter((l) => !mortas.has(l.id));
      const daFase = (f: string) => vivas.filter((l) => l.fase === f);
      const wb = daFase("wb");
      const lb = daFase("lb");
      const gf = vivas.find((l) => l.fase === "gf");
      const secao = (titulo: string, ls: LutaImpressao[]) =>
        ls.length
          ? `<div class="fase"><div class="ft">${escaparHtml(titulo)}</div>${colunas(
              ls,
              byes,
              (r, t) => rotuloRodada(r, t, "round_robin", L),
            )}</div>`
          : "";
      const secGf = gf
        ? `<div class="fase"><div class="ft">${escaparHtml(
            L.grandeFinal,
          )}</div><div class="soluta">${caixaLuta(gf, false)}</div></div>`
        : "";
      return (
        secao(L.chaveVencedores, wb) +
        secao(L.repescagem, lb) +
        secGf +
        campeaoBox(gf?.vencedorInscricaoId)
      );
    }

    if (formato === "melhor_de_tres") {
      const jogos = [...lutas].sort((a, b) => a.rodada - b.rodada);
      const a = jogos[0]?.atleta1InscricaoId ?? null;
      const b = jogos[0]?.atleta2InscricaoId ?? null;
      const venc = (id: string | null) =>
        id ? jogos.filter((j) => j.vencedorInscricaoId === id).length : 0;
      const campeao = venc(a) >= 2 ? a : venc(b) >= 2 ? b : null;
      const cells = jogos
        .map(
          (j, i) =>
            `<div class="cell"><div class="jt">${escaparHtml(L.jogo)} ${
              i + 1
            }</div>${caixaLuta(j, false)}</div>`,
        )
        .join("");
      return `<div class="bracket"><div class="round"><div class="cells">${cells}</div></div></div>${campeaoBox(
        campeao,
      )}`;
    }

    // eliminação simples e demais formatos em árvore/genérico
    const fases = [...new Set(lutas.map((l) => l.fase ?? ""))];
    const semFase = fases.length === 1 && fases[0] === "";
    if (semFase) {
      const byes = idsDeBye(lutas, formato);
      const total = Math.max(...lutas.map((l) => l.rodada));
      const final = lutas
        .filter((l) => l.rodada === total)
        .sort((a, b) => a.posicao - b.posicao)[0];
      return (
        colunas(lutas, byes, (r, t) => rotuloRodada(r, t, formato, L)) +
        campeaoBox(final?.vencedorInscricaoId)
      );
    }
    // formatos multi-fase (colocação/multistage/votação): uma seção por fase
    const byes = idsDeBye(lutas, "eliminacao_simples");
    return fases
      .map((f) => {
        const ls = lutas.filter((l) => (l.fase ?? "") === f);
        const titulo = f || L.grupo;
        return `<div class="fase"><div class="ft">${escaparHtml(
          titulo,
        )}</div>${colunas(ls, byes, (r, t) => rotuloRodada(r, t, "round_robin", L))}</div>`;
      })
      .join("");
  };

  const secoes = chaves
    .map((chave) => {
      const corpo = corpoChave(chave);
      if (!corpo) return "";
      const swatch = chave.faixa
        ? `<span class="faixa" style="background:${corDaFaixa(chave.faixa)}"></span>`
        : "";
      return `<section class="chave">
        <div class="cab">${swatch}<h2>${escaparHtml(chave.categoriaNome)}</h2>
          <span class="fmt">${escaparHtml(o.formatoNome(chave.formato))}</span>
        </div>
        ${corpo}
      </section>`;
    })
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(o.titulo)} — ${escaparHtml(o.eventoNome)}</title>
<style>
  :root { --tinta:#18181b; --musgo:#6b7280; --linha:#d4d4d8; --marca:#ee2e24; }
  * { box-sizing:border-box; }
  html, body { margin:0; padding:0; background:#fff; }
  body {
    font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
    color:var(--tinta); padding:0 6mm; background:#fff;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  .barra { height:5px; background:var(--marca); margin:0 -6mm 16px; }
  .eyebrow { display:flex; justify-content:space-between; align-items:baseline; gap:16px; }
  .marca { font-size:12px; font-weight:800; letter-spacing:.14em; color:#9ca3af; text-transform:uppercase; }
  .marca b { color:var(--marca); }
  .rotulo { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#9ca3af; font-weight:700; }
  h1 { font-size:24px; font-weight:800; letter-spacing:-.01em; margin:8px 0 0; text-transform:uppercase; }

  .chave { break-before:page; padding-top:14px; }
  .chave:first-of-type { break-before:auto; padding-top:6px; }
  .cab { display:flex; align-items:center; gap:9px; padding-bottom:10px; margin-bottom:8px; border-bottom:2px solid var(--tinta); }
  .cab h2 { font-size:17px; font-weight:800; letter-spacing:.01em; margin:0; text-transform:uppercase; }
  .cab .fmt { margin-left:auto; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--musgo); font-weight:700; }
  .faixa { display:inline-block; width:14px; height:14px; border:1px solid #a1a1aa; transform:skewX(-9deg); }

  .fase { margin-top:6px; }
  .ft { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--marca); margin:12px 0 4px; }

  .bracket { display:flex; align-items:stretch; }
  .round { display:flex; flex-direction:column; min-width:172px; }
  .rt { text-align:center; font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--musgo); margin-bottom:6px; }
  .cells { flex:1; display:flex; flex-direction:column; padding:0 14px; }
  .cell { flex:1; display:flex; flex-direction:column; justify-content:center; position:relative; padding:5px 0; }
  .jt { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--musgo); margin-bottom:3px; }

  .luta { position:relative; border:1px solid var(--linha); border-radius:6px; overflow:hidden; background:#fff; break-inside:avoid; }
  .soluta { max-width:220px; }
  .atl { padding:6px 9px; font-size:12px; line-height:1.15; }
  .atl + .atl { border-top:1px solid var(--linha); }
  .atl.venc { font-weight:800; }
  .atl.venc::before { content:"▸ "; color:var(--marca); }
  .atl.perd { color:#a1a1aa; text-decoration:line-through; }
  .atl.vazio { color:#a1a1aa; font-style:italic; }
  .ac { font-size:9px; color:var(--musgo); letter-spacing:.02em; }
  .met { padding:4px 9px; font-size:9px; color:var(--musgo); border-top:1px dashed var(--linha); text-transform:uppercase; letter-spacing:.04em; }

  /* conectores horizontais no vão entre colunas */
  .round:not(:last-child) .luta::after { content:""; position:absolute; right:-14px; top:50%; width:14px; border-top:1px solid var(--linha); }
  .round:not(:first-child) .luta::before { content:""; position:absolute; left:-14px; top:50%; width:14px; border-top:1px solid var(--linha); }

  .campeao { display:inline-block; margin-top:12px; border:1px solid var(--marca); background:#fff5f4; padding:6px 14px; font-size:12px; letter-spacing:.02em; text-transform:uppercase; }
  .campeao b { color:var(--marca); }

  footer { margin-top:20px; padding-top:10px; border-top:1px solid var(--linha); display:flex; justify-content:space-between; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:#9ca3af; }
  @page { size:A4 landscape; margin:12mm; }
  @media print { body { padding:0; } .barra { margin:0 0 16px; } }
</style>
</head>
<body>
  <div class="barra"></div>
  <div class="eyebrow">
    <span class="marca">League<b>Mat</b></span>
    <span class="rotulo">${escaparHtml(o.titulo)}</span>
  </div>
  <h1>${escaparHtml(o.eventoNome)}</h1>
  ${secoes}
  <footer>
    <span>LEAGUEMAT</span>
    <span>${escaparHtml(o.geradoEmRotulo)} ${escaparHtml(o.geradoEm)}</span>
  </footer>
</body>
</html>`;
}
