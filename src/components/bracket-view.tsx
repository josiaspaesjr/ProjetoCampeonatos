"use client";

import { useEffect, useRef, useState } from "react";
import type { lutas } from "@/db/schema";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { NativeSelect } from "@/components/ui/native-select";
import { idsDeBye } from "@/lib/chaves/byes";

type LutaRow = typeof lutas.$inferSelect;

export interface AtletaInfo {
  nome: string;
  academia: string | null;
}

/** rótulos traduzíveis da chave; padrão pt quando não informados */
export interface BracketLabels {
  rodadaPre: string;
  rodadaPos: string;
  final: string;
  semifinal: string;
  quartas: string;
  oitavas: string;
  campeao: string;
  jogo: string;
  dispensado: string;
  chaveVencedores: string;
  repescagem: string;
  grandeFinal: string;
  colocacaoFinal: string;
  grupo: string;
  playoff: string;
  vitoriasAbrev: string;
  aguardando: string;
  bye: string;
  metodos: Record<string, string>;
}

const LABELS_PT: BracketLabels = {
  rodadaPre: "",
  rodadaPos: "ª rodada",
  final: "Final",
  semifinal: "Semifinal",
  quartas: "Quartas",
  oitavas: "Oitavas",
  campeao: "Campeão",
  jogo: "Jogo",
  dispensado: "dispensado",
  chaveVencedores: "Chave de vencedores",
  repescagem: "Repescagem",
  grandeFinal: "Grande final",
  colocacaoFinal: "Colocação final",
  grupo: "Grupo",
  playoff: "Playoff",
  vitoriasAbrev: "V",
  aguardando: "aguardando",
  bye: "bye",
  metodos: {
    pontos: "Pontos",
    vantagens: "Vantagens",
    finalizacao: "Finalização",
    decisao: "Decisão",
    wo: "W.O.",
    dq: "Desqualificação",
  },
};

interface Props {
  lutas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  /** formato da chave — round robin não tem "final", só rodadas */
  formato?: string;
  /** quando presente, lutas prontas exibem formulário de resultado */
  acaoResultado?: (formData: FormData) => Promise<void>;
  /** votação por jurados: salva as notas de uma apresentação */
  acaoNotas?: (formData: FormData) => Promise<void>;
  /** votação por jurados: nº de jurados por atleta */
  numJurados?: number;
  /** rótulos no idioma atual (padrão pt) */
  labels?: BracketLabels;
}

/** rótulo de uma rodada de eliminação, contado a partir da final. */
const rotuloRodada = (
  rodada: number,
  total: number,
  formato: string | undefined,
  L: BracketLabels,
): string => {
  const generico = `${L.rodadaPre}${rodada}${L.rodadaPos}`;
  if (formato === "round_robin") return generico;
  const doFim = total - rodada;
  if (doFim === 0) return L.final;
  if (doFim === 1) return L.semifinal;
  if (doFim === 2) return L.quartas;
  if (doFim === 3) return L.oitavas;
  return generico;
};

function LinhaAtleta({
  inscricaoId,
  atletas,
  vencedor,
  slotLivre,
  alinhar = "esquerda",
}: {
  inscricaoId: string | null;
  atletas: Record<string, AtletaInfo>;
  vencedor: string | null;
  slotLivre: string;
  alinhar?: "esquerda" | "direita";
}) {
  const dir = alinhar === "direita";
  if (!inscricaoId) {
    return (
      <p
        className={`truncate text-xs italic text-muted-foreground ${dir ? "text-right" : ""}`}
      >
        {slotLivre}
      </p>
    );
  }
  const info = atletas[inscricaoId];
  const ganhou = vencedor === inscricaoId;
  const perdeu = vencedor !== null && !ganhou;
  return (
    <p
      className={`truncate text-sm ${dir ? "text-right" : ""} ${ganhou ? "font-bold text-success" : ""} ${perdeu ? "text-muted-foreground line-through" : ""}`}
    >
      {info?.nome ?? "?"}
      {info?.academia && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          · {info.academia}
        </span>
      )}
    </p>
  );
}

/** Cartão de uma luta: dois atletas, método e (quando permitido) o formulário. */
function CartaoLuta({
  luta,
  bye,
  atletas,
  labels: L,
  acaoResultado,
  alinhar = "esquerda",
}: {
  luta: LutaRow;
  bye: boolean;
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
  alinhar?: "esquerda" | "direita";
}) {
  const pronta =
    !bye &&
    luta.atleta1InscricaoId &&
    luta.atleta2InscricaoId &&
    !luta.vencedorInscricaoId;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm transition-colors">
      {/* num bye, o slot vazio (qualquer um dos dois) mostra "bye" */}
      <LinhaAtleta
        inscricaoId={luta.atleta1InscricaoId}
        atletas={atletas}
        vencedor={luta.vencedorInscricaoId}
        slotLivre={bye ? L.bye : L.aguardando}
        alinhar={alinhar}
      />
      <div className="my-1 border-t border-border/60" />
      <LinhaAtleta
        inscricaoId={luta.atleta2InscricaoId}
        atletas={atletas}
        vencedor={luta.vencedorInscricaoId}
        slotLivre={bye ? L.bye : L.aguardando}
        alinhar={alinhar}
      />

      {luta.vencedorInscricaoId && luta.metodo && (
        <p
          className={`mt-2 text-xs text-muted-foreground ${alinhar === "direita" ? "text-right" : ""}`}
        >
          {L.metodos[luta.metodo] ?? luta.metodo}
          {luta.nomeFinalizacao ? ` — ${luta.nomeFinalizacao}` : ""}
        </p>
      )}

      {pronta && acaoResultado && (
        <form action={acaoResultado} className="mt-3 space-y-2 border-t pt-2">
          <input type="hidden" name="lutaId" value={luta.id} />
          <div className="flex flex-col gap-1 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="vencedorId"
                value={luta.atleta1InscricaoId!}
                required
              />
              {atletas[luta.atleta1InscricaoId!]?.nome}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="vencedorId"
                value={luta.atleta2InscricaoId!}
              />
              {atletas[luta.atleta2InscricaoId!]?.nome}
            </label>
          </div>
          <div className="flex gap-2">
            <NativeSelect name="metodo" className="h-7 px-1 py-0 text-xs">
              {Object.entries(L.metodos).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </NativeSelect>
            <BotaoAcaoBruto className="bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              OK
            </BotaoAcaoBruto>
          </div>
        </form>
      )}
    </div>
  );
}

/** largura de cada coluna de rodada (px) e altura mínima por luta da 1ª rodada */
const COL = 240;
const SLOT = 104;

interface ColunaDados {
  rodada: number;
  lutas: LutaRow[];
}

/** Uma coluna de rodada do bracket de eliminação (esquerda ou direita). */
function ColunaBracket({
  col,
  lado,
  totalRodadas,
  byes,
  atletas,
  labels: L,
  acaoResultado,
}: {
  col: ColunaDados;
  lado: "esquerda" | "direita";
  totalRodadas: number;
  byes: Set<string>;
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="flex shrink-0 flex-col" style={{ width: COL }}>
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {rotuloRodada(col.rodada, totalRodadas, "eliminacao_simples", L)}
      </p>
      <div className="flex flex-1 flex-col justify-around gap-4">
        {col.lutas.map((luta) => (
          <div key={luta.id} data-luta-id={luta.id} data-lado={lado}>
            <CartaoLuta
              luta={luta}
              bye={byes.has(luta.id)}
              atletas={atletas}
              labels={L}
              acaoResultado={acaoResultado}
              alinhar={lado}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bracket de eliminação no formato "Copa do Mundo": metade das lutas à
 * esquerda, metade à direita, convergindo para a final no centro. Os
 * conectores são desenhados num overlay SVG medido do DOM — robusto para
 * chaves com bye (não-potência de 2), pois seguem os elos reais de avanço.
 */
function BracketEliminacao({
  linhas,
  byes,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  byes: Set<string>;
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const totalRodadas = Math.max(...linhas.map((l) => l.rodada));
  const final =
    linhas
      .filter((l) => l.rodada === totalRodadas)
      .sort((a, b) => a.posicao - b.posicao)[0] ?? null;

  // elos: cada luta → suas alimentadoras (quem avança para ela)
  const filhas = new Map<string, LutaRow[]>();
  for (const l of linhas) {
    if (!l.proximaLutaId) continue;
    filhas.set(l.proximaLutaId, [...(filhas.get(l.proximaLutaId) ?? []), l]);
  }
  const subarvore = (raizId: string | undefined): Set<string> => {
    const ids = new Set<string>();
    if (!raizId) return ids;
    const fila = [raizId];
    while (fila.length) {
      const id = fila.pop()!;
      ids.add(id);
      for (const f of filhas.get(id) ?? []) fila.push(f.id);
    }
    return ids;
  };

  const alimentadoras = final ? (filhas.get(final.id) ?? []) : [];
  const raizEsq = alimentadoras.find((l) => l.proximaLutaSlot === 1);
  const raizDir = alimentadoras.find((l) => l.proximaLutaSlot === 2);
  const idsEsq = subarvore(raizEsq?.id);
  const idsDir = subarvore(raizDir?.id);

  const colunasDoLado = (ids: Set<string>): ColunaDados[] => {
    const cols: ColunaDados[] = [];
    for (let r = 1; r < totalRodadas; r++) {
      const daRodada = linhas
        .filter((l) => l.rodada === r && ids.has(l.id))
        .sort((a, b) => a.posicao - b.posicao);
      if (daRodada.length) cols.push({ rodada: r, lutas: daRodada });
    }
    return cols;
  };
  const colsEsq = colunasDoLado(idsEsq);
  const colsDir = colunasDoLado(idsDir);

  const minAltura =
    Math.max(colsEsq[0]?.lutas.length ?? 1, colsDir[0]?.lutas.length ?? 1, 1) *
    SLOT;

  // ---- overlay de conectores (medido do DOM) ----
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const recompute = () => {
      const cr = container.getBoundingClientRect();
      // mapa id→elemento a partir do DOM (evita ref-callbacks por card)
      const mapa = new Map<string, Element>();
      container
        .querySelectorAll<HTMLElement>("[data-luta-id]")
        .forEach((el) => mapa.set(el.dataset.lutaId!, el));

      const novos: string[] = [];
      for (const l of linhas) {
        if (!l.proximaLutaId) continue;
        const de = mapa.get(l.id);
        const para = mapa.get(l.proximaLutaId);
        if (!de || !para) continue;
        const dr = de.getBoundingClientRect();
        const pr = para.getBoundingClientRect();
        const esq = (de as HTMLElement).dataset.lado === "esquerda";
        const sx = (esq ? dr.right : dr.left) - cr.left;
        const sy = dr.top + dr.height / 2 - cr.top;
        const ex = (esq ? pr.left : pr.right) - cr.left;
        const ey = pr.top + pr.height / 2 - cr.top;
        const mx = (sx + ex) / 2;
        novos.push(`M${sx} ${sy} H${mx} V${ey} H${ex}`);
      }
      setPaths(novos);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
    // recomputa quando a estrutura/vencedores mudam (alturas dos cards mudam)
  }, [linhas]);

  const campeao = final?.vencedorInscricaoId
    ? atletas[final.vencedorInscricaoId]?.nome
    : null;

  return (
    <div className="overflow-x-auto pb-4">
      <div
        ref={containerRef}
        className="relative mx-auto flex w-max items-stretch gap-12"
        style={{ minHeight: minAltura + 28 }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          fill="none"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
          ))}
        </svg>

        {colsEsq.map((col) => (
          <ColunaBracket
            key={`e${col.rodada}`}
            col={col}
            lado="esquerda"
            totalRodadas={totalRodadas}
            byes={byes}
            atletas={atletas}
            labels={L}
            acaoResultado={acaoResultado}
          />
        ))}

        {/* Coluna central: a final */}
        {final && (
          <div className="flex shrink-0 flex-col" style={{ width: COL }}>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-brand">
              {L.final}
            </p>
            <div className="flex flex-1 flex-col justify-center gap-3">
              <div data-luta-id={final.id}>
                <CartaoLuta
                  luta={final}
                  bye={byes.has(final.id)}
                  atletas={atletas}
                  labels={L}
                  acaoResultado={acaoResultado}
                />
              </div>
              {campeao && (
                <div className="border border-brand/40 bg-brand/5 px-3 py-2 text-center">
                  <p className="font-cond text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
                    🏆 {L.campeao}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-success">
                    {campeao}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {[...colsDir].reverse().map((col) => (
          <ColunaBracket
            key={`d${col.rodada}`}
            col={col}
            lado="direita"
            totalRodadas={totalRodadas}
            byes={byes}
            atletas={atletas}
            labels={L}
            acaoResultado={acaoResultado}
          />
        ))}
      </div>
    </div>
  );
}

/** Round robin: uma coluna por rodada (não é árvore, não tem final). */
function RoundRobinView({
  linhas,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const totalRodadas = Math.max(...linhas.map((l) => l.rodada));
  const rodadas = Array.from({ length: totalRodadas }, (_, i) =>
    linhas.filter((l) => l.rodada === i + 1).sort((a, b) => a.posicao - b.posicao),
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6">
        {rodadas.map((lutasDaRodada, i) => (
          <div key={i} className="w-64 shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {rotuloRodada(i + 1, totalRodadas, "round_robin", L)}
            </p>
            <div className="flex h-full flex-col justify-around gap-4">
              {lutasDaRodada.map((luta) => (
                <CartaoLuta
                  key={luta.id}
                  luta={luta}
                  bye={false}
                  atletas={atletas}
                  labels={L}
                  acaoResultado={acaoResultado}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Melhor de 3: dois atletas, série de até 3 jogos com placar da série. */
function MelhorDeTresView({
  linhas,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const jogos = [...linhas].sort((a, b) => a.rodada - b.rodada);
  const a = jogos[0]?.atleta1InscricaoId ?? null;
  const b = jogos[0]?.atleta2InscricaoId ?? null;
  const venc = (id: string | null) =>
    id ? jogos.filter((j) => j.vencedorInscricaoId === id).length : 0;
  const va = venc(a);
  const vb = venc(b);
  const decidida = Math.max(va, vb) >= 2;
  const campeaoId = va >= 2 ? a : vb >= 2 ? b : null;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 flex items-center justify-center gap-4 rounded-lg border bg-card p-4">
        <span
          className={`flex-1 truncate text-right text-sm font-semibold ${campeaoId === a ? "text-success" : ""}`}
        >
          {a ? (atletas[a]?.nome ?? "?") : "?"}
        </span>
        <span className="disp shrink-0 text-2xl tabular-nums">
          {va} <span className="text-muted-foreground">×</span> {vb}
        </span>
        <span
          className={`flex-1 truncate text-sm font-semibold ${campeaoId === b ? "text-success" : ""}`}
        >
          {b ? (atletas[b]?.nome ?? "?") : "?"}
        </span>
      </div>

      {campeaoId && (
        <div className="mb-5 border border-brand/40 bg-brand/5 px-3 py-2 text-center">
          <p className="font-cond text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
            🏆 {L.campeao}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-success">
            {atletas[campeaoId]?.nome}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {jogos.map((j, i) => {
          const anterioresOk = jogos
            .slice(0, i)
            .every((g) => g.vencedorInscricaoId);
          const dispensado = decidida && !j.vencedorInscricaoId;
          const liberado = anterioresOk && !decidida;
          return (
            <div key={j.id}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {L.jogo} {i + 1}
                {dispensado && ` · ${L.dispensado}`}
              </p>
              {dispensado ? (
                <div className="rounded-lg border border-dashed border-border bg-card/40 p-3 text-center text-xs italic text-muted-foreground">
                  {L.dispensado}
                </div>
              ) : (
                <CartaoLuta
                  luta={j}
                  bye={false}
                  atletas={atletas}
                  labels={L}
                  acaoResultado={liberado ? acaoResultado : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Coluna simples de lutas (usada pela dupla eliminação). */
function ColunaLutas({
  titulo,
  lutas,
  byes,
  atletas,
  labels: L,
  acaoResultado,
}: {
  titulo: string;
  lutas: LutaRow[];
  byes: Set<string>;
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="w-60 shrink-0">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <div className="flex flex-col justify-around gap-4">
        {lutas.map((luta) => (
          <CartaoLuta
            key={luta.id}
            luta={luta}
            bye={byes.has(luta.id)}
            atletas={atletas}
            labels={L}
            acaoResultado={acaoResultado}
          />
        ))}
      </div>
    </div>
  );
}

/** Eliminação dupla: chave de vencedores (WB) + repescagem (LB) + grande final. */
function DuplaEliminacaoView({
  linhas,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  // bye na dupla = vencedor definido com apenas um atleta (walkover)
  const byes = new Set(
    linhas
      .filter(
        (l) =>
          l.vencedorInscricaoId != null &&
          (l.atleta1InscricaoId == null) !== (l.atleta2InscricaoId == null),
      )
      .map((l) => l.id),
  );
  const vazia = (l: LutaRow) =>
    l.atleta1InscricaoId == null &&
    l.atleta2InscricaoId == null &&
    l.vencedorInscricaoId == null;

  const colunas = (fase: string) => {
    const ls = linhas.filter((l) => l.fase === fase);
    const rodadas = [...new Set(ls.map((l) => l.rodada))].sort((a, b) => a - b);
    return rodadas
      .map((r) => ({
        rodada: r,
        total: rodadas.length,
        lutas: ls
          .filter((l) => l.rodada === r && !vazia(l))
          .sort((a, b) => a.posicao - b.posicao),
      }))
      .filter((c) => c.lutas.length > 0);
  };

  const wbCols = colunas("wb");
  const lbCols = colunas("lb");
  const gf = linhas.find((l) => l.fase === "gf");
  const campeao = gf?.vencedorInscricaoId
    ? atletas[gf.vencedorInscricaoId]?.nome
    : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="disp mb-3 text-sm uppercase tracking-[0.08em]">
          {L.chaveVencedores}
        </p>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-6">
            {wbCols.map((c) => (
              <ColunaLutas
                key={`wb${c.rodada}`}
                titulo={rotuloRodada(c.rodada, c.total, "round_robin", L)}
                lutas={c.lutas}
                byes={byes}
                atletas={atletas}
                labels={L}
                acaoResultado={acaoResultado}
              />
            ))}
          </div>
        </div>
      </section>

      {lbCols.length > 0 && (
        <section>
          <p className="disp mb-3 text-sm uppercase tracking-[0.08em] text-brand-soft">
            {L.repescagem}
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-6">
              {lbCols.map((c, i) => (
                <ColunaLutas
                  key={`lb${c.rodada}`}
                  titulo={`${L.repescagem} ${i + 1}`}
                  lutas={c.lutas}
                  byes={byes}
                  atletas={atletas}
                  labels={L}
                  acaoResultado={acaoResultado}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {gf && (
        <section>
          <p className="disp mb-3 text-sm uppercase tracking-[0.08em] text-brand">
            {L.grandeFinal}
          </p>
          <div className="max-w-sm">
            <CartaoLuta
              luta={gf}
              bye={false}
              atletas={atletas}
              labels={L}
              acaoResultado={acaoResultado}
            />
            {campeao && (
              <div className="mt-3 border border-brand/40 bg-brand/5 px-3 py-2 text-center">
                <p className="font-cond text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
                  🏆 {L.campeao}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-success">
                  {campeao}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Colocação: ranking final 1..N + o bracket que o decide. */
function ColocacaoView({
  linhas,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const byes = new Set(
    linhas
      .filter(
        (l) =>
          l.vencedorInscricaoId != null &&
          (l.atleta1InscricaoId == null) !== (l.atleta2InscricaoId == null),
      )
      .map((l) => l.id),
  );
  const n = new Set(
    linhas
      .flatMap((l) => [l.atleta1InscricaoId, l.atleta2InscricaoId])
      .filter((x): x is string => x != null),
  ).size;

  // ranking a partir das lutas decisórias (fase "col:N")
  const porPos = new Map<number, string | null>();
  for (const l of linhas) {
    const m = l.fase?.match(/^col:(\d+)$/);
    if (!m) continue;
    const pos = Number(m[1]);
    const venc = l.vencedorInscricaoId;
    const perd =
      venc && !byes.has(l.id)
        ? venc === l.atleta1InscricaoId
          ? l.atleta2InscricaoId
          : l.atleta1InscricaoId
        : null;
    porPos.set(pos, venc);
    porPos.set(pos + 1, perd);
  }
  const medalha = (p: number) =>
    p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : `${p}º`;

  const rodadas = [...new Set(linhas.map((l) => l.rodada))].sort((a, b) => a - b);
  const cols = rodadas
    .map((r) => ({
      rodada: r,
      lutas: linhas
        .filter(
          (l) =>
            l.rodada === r &&
            !(
              l.atleta1InscricaoId == null &&
              l.atleta2InscricaoId == null &&
              l.vencedorInscricaoId == null
            ),
        )
        .sort((a, b) => a.posicao - b.posicao),
    }))
    .filter((c) => c.lutas.length > 0);

  return (
    <div className="space-y-8">
      <section>
        <p className="disp mb-3 text-sm uppercase tracking-[0.08em] text-brand">
          {L.colocacaoFinal}
        </p>
        <ol className="max-w-sm divide-y divide-border rounded-lg border bg-card">
          {Array.from({ length: n }, (_, i) => i + 1).map((pos) => {
            const at = porPos.get(pos) ?? null;
            return (
              <li key={pos} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-8 shrink-0 text-center font-bold tabular-nums">
                  {medalha(pos)}
                </span>
                <span
                  className={at ? "truncate" : "truncate italic text-muted-foreground"}
                >
                  {at ? (atletas[at]?.nome ?? "?") : L.aguardando}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-6">
            {cols.map((c) => (
              <ColunaLutas
                key={c.rodada}
                titulo={rotuloRodada(c.rodada, cols.length, "round_robin", L)}
                lutas={c.lutas}
                byes={byes}
                atletas={atletas}
                labels={L}
                acaoResultado={acaoResultado}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Um grupo do multistage: classificação (top-2 destacado) + os jogos. */
function TabelaGrupo({
  titulo,
  matches,
  atletas,
  labels: L,
  acaoResultado,
}: {
  titulo: string;
  matches: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const ids = [
    ...new Set(
      matches
        .flatMap((l) => [l.atleta1InscricaoId, l.atleta2InscricaoId])
        .filter((x): x is string => x != null),
    ),
  ];
  const v = (id: string) => matches.filter((l) => l.vencedorInscricaoId === id).length;
  const f = (id: string) =>
    matches.filter((l) => l.vencedorInscricaoId === id && l.metodo === "finalizacao")
      .length;
  const rank = ids
    .map((id) => ({ id, v: v(id), f: f(id) }))
    .sort((a, b) => b.v - a.v || b.f - a.f);

  return (
    <div className="w-72 shrink-0 rounded-lg border bg-card p-4">
      <p className="disp mb-2 text-sm uppercase tracking-[0.06em]">{titulo}</p>
      <ol className="mb-3 divide-y divide-border/60 text-sm">
        {rank.map((r, i) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-2 py-1.5 ${i < 2 ? "font-semibold text-success" : ""}`}
          >
            <span className="min-w-0 truncate">
              <span className="mr-2 text-muted-foreground">{i + 1}º</span>
              {atletas[r.id]?.nome ?? "?"}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {r.v} {L.vitoriasAbrev}
            </span>
          </li>
        ))}
      </ol>
      <div className="space-y-2 border-t pt-2">
        {[...matches]
          .sort((a, b) => a.rodada - b.rodada)
          .map((luta) => (
            <CartaoLuta
              key={luta.id}
              luta={luta}
              bye={false}
              atletas={atletas}
              labels={L}
              acaoResultado={acaoResultado}
            />
          ))}
      </div>
    </div>
  );
}

/** Multistage: fase de grupos (classificação) + playoff (bracket). */
function MultistageView({
  linhas,
  atletas,
  labels: L,
  acaoResultado,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoResultado?: (formData: FormData) => Promise<void>;
}) {
  const grupos = [
    ...new Set(
      linhas.filter((l) => l.fase?.startsWith("grupo:")).map((l) => l.fase!),
    ),
  ].sort();
  const playoffLutas = linhas.filter((l) => l.fase === "playoff");
  const byesPlayoff = idsDeBye(playoffLutas, "eliminacao_simples");

  return (
    <div className="space-y-8">
      <section>
        <p className="disp mb-3 text-sm uppercase tracking-[0.08em]">{L.grupo}s</p>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start gap-4">
            {grupos.map((fase, i) => (
              <TabelaGrupo
                key={fase}
                titulo={`${L.grupo} ${i + 1}`}
                matches={linhas.filter((l) => l.fase === fase)}
                atletas={atletas}
                labels={L}
                acaoResultado={acaoResultado}
              />
            ))}
          </div>
        </div>
      </section>

      {playoffLutas.length > 0 && (
        <section>
          <p className="disp mb-3 text-sm uppercase tracking-[0.08em] text-brand">
            {L.playoff}
          </p>
          <BracketEliminacao
            linhas={playoffLutas}
            byes={byesPlayoff}
            atletas={atletas}
            labels={L}
            acaoResultado={acaoResultado}
          />
        </section>
      )}
    </div>
  );
}

/** Votação por jurados: ranking por soma das notas + lançamento das notas. */
function VotacaoView({
  linhas,
  atletas,
  labels: L,
  acaoNotas,
  numJurados = 3,
}: {
  linhas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  labels: BracketLabels;
  acaoNotas?: (formData: FormData) => Promise<void>;
  numJurados?: number;
}) {
  const apres = linhas.filter((l) => l.fase === "apresentacao" && l.atleta1InscricaoId);
  const total = (notas: number[] | null) => (notas ?? []).reduce((s, n) => s + n, 0);
  const maxN = (notas: number[] | null) =>
    notas && notas.length ? Math.max(...notas) : 0;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const rank = [...apres].sort(
    (a, b) => total(b.notas) - total(a.notas) || maxN(b.notas) - maxN(a.notas),
  );
  const medalha = (p: number) =>
    p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : `${p}º`;

  return (
    <div className="max-w-2xl">
      <p className="disp mb-3 text-sm uppercase tracking-[0.08em] text-brand">
        {L.colocacaoFinal}
      </p>
      <ol className="divide-y divide-border rounded-lg border bg-card">
        {rank.map((l, i) => (
          <li key={l.id} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-8 shrink-0 text-center font-bold tabular-nums">
                  {medalha(i + 1)}
                </span>
                <span className="truncate text-sm">
                  {atletas[l.atleta1InscricaoId!]?.nome ?? "?"}
                </span>
              </span>
              <span className="disp shrink-0 text-lg tabular-nums">
                {fmt(total(l.notas))}
              </span>
            </div>
            {l.notas && l.notas.length > 0 && (
              <p className="mt-1 pl-11 text-xs text-muted-foreground">
                {l.notas.map(fmt).join(" · ")}
              </p>
            )}
            {acaoNotas && (
              <form
                action={acaoNotas}
                className="mt-2 flex flex-wrap items-center gap-2 pl-11"
              >
                <input type="hidden" name="lutaId" value={l.id} />
                {Array.from({ length: numJurados }, (_, j) => (
                  <input
                    key={j}
                    type="number"
                    name="nota"
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={l.notas?.[j] ?? ""}
                    aria-label={`Jurado ${j + 1}`}
                    placeholder={`J${j + 1}`}
                    className="h-8 w-16 rounded border bg-transparent px-1 text-center text-xs"
                  />
                ))}
                <BotaoAcaoBruto className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  OK
                </BotaoAcaoBruto>
              </form>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BracketView({
  lutas: linhas,
  atletas,
  formato,
  acaoResultado,
  acaoNotas,
  numJurados,
  labels,
}: Props) {
  const L = labels ?? LABELS_PT;
  if (!linhas.length) return null;

  if (formato === "votacao_jurados") {
    return (
      <VotacaoView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoNotas={acaoNotas}
        numJurados={numJurados}
      />
    );
  }

  if (formato === "multistage") {
    return (
      <MultistageView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoResultado={acaoResultado}
      />
    );
  }

  if (formato === "eliminacao_dupla") {
    return (
      <DuplaEliminacaoView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoResultado={acaoResultado}
      />
    );
  }

  if (formato === "colocacao") {
    return (
      <ColocacaoView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoResultado={acaoResultado}
      />
    );
  }

  if (formato === "round_robin") {
    return (
      <RoundRobinView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoResultado={acaoResultado}
      />
    );
  }

  if (formato === "melhor_de_tres") {
    return (
      <MelhorDeTresView
        linhas={linhas}
        atletas={atletas}
        labels={L}
        acaoResultado={acaoResultado}
      />
    );
  }

  // eliminação simples, tres_repescagem e demais formatos em árvore
  const byes = idsDeBye(linhas, formato ?? "eliminacao_simples");
  return (
    <BracketEliminacao
      linhas={linhas}
      byes={byes}
      atletas={atletas}
      labels={L}
      acaoResultado={acaoResultado}
    />
  );
}
