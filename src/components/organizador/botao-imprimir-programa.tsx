"use client";

import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { escaparHtml, imprimirHtml } from "@/lib/print";
import { useDic } from "@/lib/i18n/client";
import type { AreaCron } from "@/lib/cronograma/cronograma-areas";

interface LinhaPrograma {
  diaNumero: number;
  dataLabel: string;
  hora: string;
  area: string;
  faixa: string | null;
  titulo: string;
  subtitulo: string;
  nLutas: number;
}

interface Rotulos {
  programa: string;
  dia: string;
  colHora: string;
  colArea: string;
  colCategoria: string;
  colLutas: string;
  geradoEm: string;
}

/** achata o cronograma em linhas ordenadas por (dia, hora, área) */
export function linhasDoCronograma(cronograma: AreaCron[]): LinhaPrograma[] {
  const linhas: LinhaPrograma[] = [];
  for (const area of cronograma) {
    for (const c of area.categorias) {
      linhas.push({
        diaNumero: c.diaNumero,
        dataLabel: c.dataLabel,
        hora: c.hora,
        area: area.nome,
        faixa: c.faixa,
        titulo: c.titulo,
        subtitulo: c.subtitulo,
        nLutas: c.nLutas,
      });
    }
  }
  return linhas.sort(
    (a, b) =>
      a.diaNumero - b.diaNumero ||
      a.hora.localeCompare(b.hora) ||
      a.area.localeCompare(b.area),
  );
}

/** documento HTML autocontido (A4, tema claro) da programação agrupada por dia */
function montarHtml(
  cronograma: AreaCron[],
  eventoNome: string,
  r: Rotulos,
  geradoEm: string,
): string {
  const linhas = linhasDoCronograma(cronograma);

  // agrupa por dia, na ordem
  const dias = new Map<number, { dataLabel: string; linhas: LinhaPrograma[] }>();
  for (const l of linhas) {
    const g = dias.get(l.diaNumero);
    if (g) g.linhas.push(l);
    else dias.set(l.diaNumero, { dataLabel: l.dataLabel, linhas: [l] });
  }

  const secoes = [...dias.entries()]
    .map(([num, g]) => {
      const corpo = g.linhas
        .map(
          (l) => `
        <tr>
          <td class="hora">${escaparHtml(l.hora)}</td>
          <td class="area">${escaparHtml(l.area)}</td>
          <td class="cat">
            <span class="faixa" style="background:${l.faixa ? corDaFaixa(l.faixa) : "transparent"}"></span>
            <b>${escaparHtml(l.titulo)}</b>
            <span class="sub">${escaparHtml(l.subtitulo)}</span>
          </td>
          <td class="num">${l.nLutas}</td>
        </tr>`,
        )
        .join("");
      return `
      <section>
        <h2>${escaparHtml(r.dia)} ${num} · ${escaparHtml(g.dataLabel)}</h2>
        <table>
          <thead>
            <tr>
              <th class="hora">${escaparHtml(r.colHora)}</th>
              <th class="area">${escaparHtml(r.colArea)}</th>
              <th>${escaparHtml(r.colCategoria)}</th>
              <th class="num">${escaparHtml(r.colLutas)}</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaparHtml(r.programa)} — ${escaparHtml(eventoNome)}</title>
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
  h2 { font-size:14px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--marca); margin:26px 0 0; padding-bottom:5px; border-bottom:2px solid var(--tinta); }
  section { break-inside:auto; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  thead th { text-align:left; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--musgo); padding:8px 10px 7px; border-bottom:1px solid var(--linha); }
  th.hora, td.hora { width:58px; }
  th.area, td.area { width:80px; }
  th.num, td.num { width:44px; text-align:right; color:#9ca3af; }
  tbody td { padding:9px 10px; border-bottom:1px solid var(--linha); font-size:12.5px; vertical-align:middle; }
  tbody tr { break-inside:avoid; }
  tbody tr:nth-child(even) td { background:#f8f8f8; }
  td.hora { font-weight:800; white-space:nowrap; }
  td.area { font-size:11px; letter-spacing:.04em; text-transform:uppercase; color:#3f3f46; white-space:nowrap; }
  td.cat b { font-weight:700; }
  td.cat .sub { color:#6b7280; font-size:11px; margin-left:8px; }
  .faixa { display:inline-block; width:12px; height:12px; margin-right:8px; vertical-align:-1px; border:1px solid #d4d4d8; transform:skewX(-9deg); }
  footer { margin-top:26px; padding-top:12px; border-top:1px solid var(--linha); display:flex; justify-content:space-between; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:#9ca3af; }
  @page { size:A4; margin:14mm; }
  @media print { body { padding:0; } .barra { margin:0 0 22px; } }
</style>
</head>
<body>
  <div class="barra"></div>
  <div class="eyebrow">
    <span class="marca">League<b>Mat</b></span>
    <span class="rotulo">${escaparHtml(r.programa)}</span>
  </div>
  <h1>${escaparHtml(eventoNome)}</h1>
  ${secoes}
  <footer>
    <span>LEAGUEMAT</span>
    <span>${escaparHtml(r.geradoEm)} ${escaparHtml(geradoEm)}</span>
  </footer>
</body>
</html>`;
}

/**
 * Botão "Imprimir programação": gera um documento A4 (tema claro) com as
 * categorias agrupadas por dia — cada uma com horário de início, área e nº de
 * lutas — e imprime via iframe oculto. Usa o cronograma já computado (respeita
 * `dataFixada`), então serve tanto o modo automático quanto o "Por dia".
 */
export function BotaoImprimirPrograma({
  cronograma,
  eventoNome,
}: {
  cronograma: AreaCron[];
  eventoNome: string;
}) {
  const dic = useDic();
  const ta = dic.admin.areas;

  function imprimir() {
    const rotulos: Rotulos = {
      programa: ta.programaTitulo,
      dia: dic.placar.dia,
      colHora: ta.colHora,
      colArea: ta.colArea,
      colCategoria: ta.colCategoria,
      colLutas: ta.colLutas,
      geradoEm: ta.geradoEm,
    };
    const geradoEm = new Date().toLocaleString("pt-BR");
    imprimirHtml(montarHtml(cronograma, eventoNome, rotulos, geradoEm));
  }

  return (
    <button
      type="button"
      onClick={imprimir}
      className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
    >
      <span className="inline-block skew-x-9">🖨 {ta.imprimirPrograma}</span>
    </button>
  );
}
