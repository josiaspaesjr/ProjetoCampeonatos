"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import {
  classesEmOrdem,
  contarGrupos,
} from "@/lib/categorias/distribuicao-areas";
import {
  AbrirLutaCtx,
  ModalPlacar,
  ProgramacaoAreas,
  type LutaSelecionada,
} from "@/components/cronograma/programacao-areas";
import { EditorOrdemAreas } from "@/components/cronograma/editor-ordem-areas";
import type { AreaCron } from "@/lib/cronograma/cronograma-areas";
import { blocosPorGrupo } from "@/lib/cronograma/blocos";
import { BlocosHorario } from "@/components/cronograma/blocos-horario";
import {
  CamposDiasEvento,
  type DiaEvento,
} from "@/components/organizador/campos-dias-evento";
import {
  filtrosVazios,
  PainelPorDia,
  resumoPorDia,
  type CategoriaFiltro,
  type DiaDistinto,
  type DimensoesGrade,
  type FiltroState,
} from "@/components/organizador/painel-por-dia";
import { AssistentePassos } from "@/components/organizador/assistente-passos";
import { EditorOrdemClasses } from "@/components/organizador/editor-ordem-classes";
import { BuscaCronograma } from "@/components/organizador/busca-cronograma";
import { BotaoImprimirPrograma } from "@/components/organizador/botao-imprimir-programa";
import { CamposTemposLuta } from "@/components/organizador/campos-tempos-luta";
import {
  CHAVES_TEMPO,
  TEMPOS_PADRAO,
  type ChaveTempo,
} from "@/lib/cronograma/tempos";
import { useDic } from "@/lib/i18n/client";
import { RecomendacaoAreasWidget } from "@/components/organizador/recomendacao-areas";
import type { RecomendacaoAreas } from "@/lib/cronograma/recomendacao";

const AREAS_MIN = 1;
const AREAS_MAX = 40;

/** categoria enxuta usada só na legenda do funil e no resumo (4 stats) */
export interface CategoriaView {
  classeIdade: string;
  sexo: string;
  faixa: string | null;
}

export function EstruturadorAreas({
  categorias,
  numAreasInicial,
  recomendacao,
  base,
  eventoNome,
  cronograma,
  dias,
  tempos,
  diasDistintos,
  dimensoes,
  categoriasFiltro,
  modoInicial,
  ordemClasses,
  erro,
  estruturar,
  estruturarPorDia,
  salvarDias,
  salvarTempos,
  salvarOrdemClasses,
  reordenar,
  moverLuta,
  moverCategoria,
}: {
  categorias: CategoriaView[];
  numAreasInicial: number | null;
  /** quantos tatames as lutas previstas pedem; null sem grade ou sem período */
  recomendacao: RecomendacaoAreas | null;
  /** caminho base do evento, ex.: `/organizador/eventos/:id` */
  base: string;
  /** nome do evento (título da programação imprimível) */
  eventoNome: string;
  /** cronograma real por área (persistido) — vazio quando não estruturado */
  cronograma: AreaCron[];
  /** dias do evento (data + início/fim), para configurar aqui também */
  dias: DiaEvento[];
  /** minutos por luta em vigor (padrão CBJJ + o que o organizador mudou) */
  tempos: Record<ChaveTempo, number>;
  /** dias distintos do evento (para o modo "Por dia") */
  diasDistintos: DiaDistinto[];
  /** dimensões presentes na grade (classes/sexos/faixas) para os filtros por dia */
  dimensoes: DimensoesGrade;
  /** categorias enxutas (para casar os filtros no cliente) */
  categoriasFiltro: CategoriaFiltro[];
  /** modo em que a estrutura atual foi montada */
  modoInicial: "auto" | "porDia";
  /** ordem do dia salva no evento (ids das classes) — nula = regra padrão */
  ordemClasses: string[] | null;
  /** aviso vindo do servidor (ex.: as lutas não cabem no período) */
  erro?: string;
  estruturar: (formData: FormData) => void | Promise<void>;
  estruturarPorDia: (formData: FormData) => void | Promise<void>;
  salvarDias: (formData: FormData) => void | Promise<void>;
  /** persiste a tabela de tempos de luta do evento */
  salvarTempos: (formData: FormData) => void | Promise<void>;
  /** persiste a ordem do dia (classes de idade) escolhida pelo organizador */
  salvarOrdemClasses: (classeIds: string[]) => void | Promise<void>;
  /** persiste a ordem manual das lutas de uma área (drag-and-drop) */
  reordenar: (areaId: string, lutaIds: string[]) => void | Promise<void>;
  /** leva uma luta para outro tatame (com a ordem final do destino) */
  moverLuta: (
    lutaId: string,
    areaDestinoId: string,
    lutaIdsDestino: string[],
  ) => void | Promise<void>;
  /** leva uma categoria inteira para outro tatame */
  moverCategoria: (
    categoriaId: string,
    areaDestinoId: string,
  ) => void | Promise<void>;
}) {
  // a estrutura vem persistida do servidor: a prévia só muda ao "Estruturar"
  const estruturado = cronograma.length > 0;

  const [areasN, setAreasN] = useState(
    numAreasInicial ? String(numAreasInicial) : "",
  );
  const [modo, setModo] = useState<"auto" | "porDia">(modoInicial);
  const [areasFull, setAreasFull] = useState(false);
  const [reordenando, setReordenando] = useState(false);
  const [lutaSel, setLutaSel] = useState<LutaSelecionada | null>(null);
  // com as lutas já distribuídas o assistente começa recolhido (vira resumo)
  const [assistenteAberto, setAssistenteAberto] = useState(!estruturado);
  const [buscaAberta, setBuscaAberta] = useState(false);
  // filtros do modo "Por dia" moram aqui: o assistente mostra os filtros num
  // passo e o botão de estruturar em outro
  const [filtros, setFiltros] = useState<FiltroState[]>(() =>
    filtrosVazios(diasDistintos.length),
  );

  const dic = useDic();
  const ta = dic.admin.areas;
  const db = dic.blocosHorario;

  const nInt = Math.floor(Number(areasN));
  const nValido =
    Number.isFinite(nInt) && nInt >= AREAS_MIN && nInt <= AREAS_MAX;
  const totalCategorias = categorias.length;
  const temCategorias = totalCategorias > 0;

  // resumo de cada passo (aparece na trilha e no modo recolhido)
  const diasDistintosN = new Set(dias.map((d) => d.data.slice(0, 10))).size;
  const resumoDias = `${diasDistintosN} ${diasDistintosN === 1 ? ta.assistenteResumoDia : ta.assistenteResumoDias} · ${dias[0]?.inicio ?? ""}–${dias[dias.length - 1]?.fim ?? ""}`;
  const ajustados = CHAVES_TEMPO.filter(
    (k) => tempos[k] !== TEMPOS_PADRAO[k],
  ).length;
  const resumoTempos = ajustados
    ? `${ajustados} ${ta.assistenteResumoAjustados}`
    : ta.assistenteResumoPadrao;
  const atribuidasPorDia = resumoPorDia(
    diasDistintos,
    filtros,
    categoriasFiltro,
  ).atribuidas;

  const gruposTotal = useMemo(() => contarGrupos(categorias), [categorias]);
  // ordem do dia em vigor: a que o organizador salvou ou a regra padrão
  const classesDoFunil = useMemo(
    () => classesEmOrdem(categorias, ordemClasses),
    [categorias, ordemClasses],
  );
  const classesPadrao = useMemo(
    () => classesEmOrdem(categorias).map((c) => c.id),
    [categorias],
  );

  // tela cheia e modal de placar: travam o scroll do body e fecham com Esc
  // (Esc fecha primeiro o modal, depois a tela cheia)
  useEffect(() => {
    if (!areasFull && !lutaSel) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lutaSel) setLutaSel(null);
      else if (areasFull) setAreasFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [areasFull, lutaSel]);

  // ---- SEM CATEGORIAS: bloqueia com prompt para a seção Categorias ----
  if (!temCategorias) {
    return (
      <div className="relative border border-white/10 bg-surface px-[22px] py-12 text-center">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
        <div className="disp text-[26px]">{ta.nenhumaCategoria}</div>
        <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-2">
          {ta.gereGradeAntes}
        </p>
        <Link
          href={`${base}/categorias`}
          className="mt-5 inline-flex -skew-x-9 items-center bg-brand px-5 py-3 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
        >
          <span className="inline-block skew-x-9">
            {ta.irPara} {dic.admin.nav.categorias} →
          </span>
        </Link>
      </div>
    );
  }

  const areasAtuais = cronograma.length;
  const media = areasAtuais ? Math.round(totalCategorias / areasAtuais) : 0;

  return (
    <AbrirLutaCtx.Provider value={setLutaSel}>
      {/* reajuste ao vivo: com cronograma na tela, re-busca o servidor (soft,
          preserva o estado do cliente) para os horários acompanharem as lutas.
          Pausado ao reordenar para o re-fetch não atropelar o arraste. */}
      {estruturado && !reordenando && <AutoRefresh segundos={30} />}

      {/* AVISO (ex.: as lutas não cabem no período) */}
      {erro && (
        <div className="flex items-start gap-3 border border-brand/40 bg-brand/10 px-[18px] py-4">
          <span className="mt-1.5 h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
          <p className="text-[15px] font-medium leading-normal text-foreground">
            {erro}
          </p>
        </div>
      )}

      {/* ASSISTENTE: dias → tempo de luta → categorias por dia → ordem do dia
          → montagem. Já estruturado, começa recolhido (vira linha de resumo) */}
      <AssistentePassos
        titulo={ta.assistenteTitulo}
        aberto={assistenteAberto}
        onAlternar={() => setAssistenteAberto((v) => !v)}
        passos={[
          {
            id: "dias",
            titulo: ta.assistenteDias,
            resumo: resumoDias,
            conteudo: (
              <form
                id="form-dias"
                action={salvarDias}
                className="flex flex-col gap-4"
              >
                <p className="max-w-2xl font-cond text-[13px] uppercase tracking-[0.02em] text-muted-3">
                  {ta.diasNota}
                </p>
                <CamposDiasEvento
                  labelCls="disp text-[22px]"
                  defaultDias={dias}
                  semTitulo
                />
              </form>
            ),
            acao: (
              <BotaoAcaoBruto
                form="form-dias"
                className="inline-flex -skew-x-9 items-center border border-white/16 px-5 py-2.5 font-cond text-[14px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-brand/50 hover:text-brand-soft"
              >
                <span className="inline-block skew-x-9">{ta.salvarDias}</span>
              </BotaoAcaoBruto>
            ),
          },
          {
            id: "tempo",
            titulo: ta.assistenteTempo,
            resumo: resumoTempos,
            conteudo: (
              <form
                id="form-tempos"
                action={salvarTempos}
                className="flex flex-col gap-4"
              >
                <CamposTemposLuta valores={tempos} />
              </form>
            ),
            acao: (
              <BotaoAcaoBruto
                form="form-tempos"
                className="inline-flex -skew-x-9 items-center border border-white/16 px-5 py-2.5 font-cond text-[14px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-brand/50 hover:text-brand-soft"
              >
                <span className="inline-block skew-x-9">{ta.temposSalvar}</span>
              </BotaoAcaoBruto>
            ),
          },
          {
            id: "distribuicao",
            titulo: ta.assistenteDistribuicao,
            resumo:
              modo === "auto"
                ? ta.assistenteResumoAuto
                : `${resumoPorDia(diasDistintos, filtros, categoriasFiltro).atribuidas}/${totalCategorias}`,
            conteudo: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
                    {ta.modoLabel}
                  </span>
                  <div className="flex">
                    {(
                      [
                        ["auto", ta.modoAutomatico],
                        ["porDia", ta.modoPorDia],
                      ] as ["auto" | "porDia", string][]
                    ).map(([val, rotulo]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setModo(val)}
                        className={cn(
                          "-skew-x-9 border px-4 py-2 font-cond text-[14px] font-semibold uppercase tracking-[0.04em] transition-colors",
                          modo === val
                            ? "border-brand bg-brand text-white"
                            : "border-white/16 text-muted-2 hover:border-white/30",
                        )}
                      >
                        <span className="inline-block skew-x-9">{rotulo}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {modo === "auto" ? (
                  <p className="max-w-2xl font-cond text-[13px] uppercase leading-relaxed tracking-[0.02em] text-muted-3">
                    {ta.ajudaOrdena}
                  </p>
                ) : (
                  <PainelPorDia
                    dias={diasDistintos}
                    dimensoes={dimensoes}
                    categorias={categoriasFiltro}
                    filtros={filtros}
                    setFiltros={setFiltros}
                  />
                )}
              </div>
            ),
          },
          {
            id: "ordem",
            titulo: ta.assistenteOrdem,
            resumo: ordemClasses?.length
              ? ta.assistenteResumoOrdemPropria
              : ta.extremosMeio,
            conteudo: (
              <EditorOrdemClasses
                classes={classesDoFunil}
                ordemPadrao={classesPadrao}
                personalizada={Boolean(ordemClasses?.length)}
                salvar={salvarOrdemClasses}
              />
            ),
          },
          {
            id: "areas",
            titulo: ta.assistenteAreas,
            resumo: nValido ? String(nInt) : ta.assistenteResumoSemAreas,
            conteudo: (
              <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
                <div>
                  <label
                    htmlFor="num-areas"
                    className="mb-1.5 block font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3"
                  >
                    {ta.numeroAreas}
                  </label>
                  <input
                    id="num-areas"
                    type="number"
                    min={AREAS_MIN}
                    max={AREAS_MAX}
                    value={areasN}
                    onChange={(e) => setAreasN(e.target.value)}
                    placeholder="0"
                    className="disp tnum w-[136px] border border-white/14 bg-background px-4 py-1 text-[64px] leading-none text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <div className="font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-3">
                    {ta.categoriasCarregadas}
                  </div>
                  <div className="disp tnum mt-1.5 text-[38px] leading-none">
                    {modo === "auto" ? totalCategorias : atribuidasPorDia}
                  </div>
                  <div className="mt-1.5 font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
                    {ta.em} {gruposTotal}{" "}
                    {gruposTotal === 1 ? ta.grupo : ta.grupos}
                  </div>
                </div>
              </div>
            ),
            acao:
              modo === "auto" ? (
                <form action={estruturar}>
                  <input
                    type="hidden"
                    name="numAreas"
                    value={nValido ? nInt : ""}
                  />
                  <BotaoAcaoBruto
                    disabled={!nValido}
                    className="inline-flex -skew-x-9 items-center bg-brand px-6 py-3.5 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="inline-block skew-x-9">
                      ⚙ {ta.estruturarAreas}
                    </span>
                  </BotaoAcaoBruto>
                </form>
              ) : (
                <form action={estruturarPorDia}>
                  <input
                    type="hidden"
                    name="numAreas"
                    value={nValido ? nInt : ""}
                  />
                  <input
                    type="hidden"
                    name="atribuicoes"
                    value={JSON.stringify(
                      resumoPorDia(diasDistintos, filtros, categoriasFiltro)
                        .atribuicoes,
                    )}
                  />
                  <BotaoAcaoBruto
                    disabled={!nValido || atribuidasPorDia === 0}
                    className="inline-flex -skew-x-9 items-center bg-brand px-6 py-3.5 font-cond text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="inline-block skew-x-9">
                      ⚙ {ta.estruturarPorDia}
                    </span>
                  </BotaoAcaoBruto>
                </form>
              ),
          },
        ]}
      />

      {/* RECOMENDAÇÃO DE TATAMES — vale antes e depois de estruturar */}
      {recomendacao && <RecomendacaoAreasWidget dados={recomendacao} />}

      {estruturado ? (
        <>
          {/* RESUMO — 4 STATS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              rotulo={dic.admin.nav.areas}
              valor={String(areasAtuais)}
              sub={ta.tatames}
              destaque
            />
            <Stat
              rotulo={dic.admin.nav.categorias}
              valor={String(totalCategorias)}
              sub={ta.naGrade}
            />
            <Stat
              rotulo={ta.mediaArea}
              valor={String(media)}
              sub={dic.admin.categorias.categorias}
            />
            <Stat
              rotulo={ta.statGrupos}
              valor={String(gruposTotal)}
              sub={ta.classeSexoFaixa}
            />
          </div>

          {/* BARRA DE AÇÃO */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {reordenando ? (
              <>
                <p className="mr-auto max-w-xl font-cond text-[12px] uppercase leading-snug tracking-[0.03em] text-muted-3">
                  {ta.reordenarDica}
                </p>
                <button
                  type="button"
                  onClick={() => setReordenando(false)}
                  className="inline-flex -skew-x-9 items-center bg-brand px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
                >
                  <span className="inline-block skew-x-9">
                    ✓ {ta.reordenarConcluir}
                  </span>
                </button>
              </>
            ) : (
              <>
                <BotaoImprimirPrograma
                  cronograma={cronograma}
                  eventoNome={eventoNome}
                />
                <button
                  type="button"
                  onClick={() => setBuscaAberta((v) => !v)}
                  aria-expanded={buscaAberta}
                  className={cn(
                    "inline-flex -skew-x-9 items-center border px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors",
                    buscaAberta
                      ? "border-brand bg-brand text-white"
                      : "border-white/14 text-muted-2 hover:border-brand/50 hover:text-brand-soft",
                  )}
                >
                  <span className="inline-block skew-x-9">
                    ⌕ {buscaAberta ? ta.buscarFechar : ta.buscar}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReordenando(true)}
                  className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
                >
                  <span className="inline-block skew-x-9">
                    ⇅ {ta.reordenarLutas}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAreasFull(true)}
                  className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
                >
                  <span className="inline-block skew-x-9">
                    ⤢ {ta.expandirTelaCheia}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* BUSCA NO CRONOGRAMA (atleta · categoria · área) */}
          {buscaAberta && !reordenando && (
            <BuscaCronograma cronograma={cronograma} />
          )}

          {/* HORÁRIO POR DIVISÃO — é o que vai para os atletas. O tempo por
              luta segue distribuindo as lutas nos tatames, mas não é publicado. */}
          {!reordenando && (
            <details className="border border-white/10 bg-surface">
              <summary className="cursor-pointer list-none px-[22px] py-3.5 font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-2 transition-colors hover:text-foreground">
                {db.verBlocos}
              </summary>
              <div className="border-t border-white/8 px-[22px] py-5">
                <BlocosHorario
                  blocos={blocosPorGrupo(cronograma)}
                  multiDia={cronograma.some((a) => a.dias.length > 1)}
                />
              </div>
            </details>
          )}

          {/* COLUNAS DE ÁREA (lado a lado, scroll lateral) */}
          {reordenando ? (
            <EditorOrdemAreas
              cronograma={cronograma}
              onReordenar={reordenar}
              onMoverLuta={moverLuta}
              onMoverCategoria={moverCategoria}
            />
          ) : (
            <ProgramacaoAreas
              cronograma={cronograma}
              layout="colunas"
              base={base}
              full={false}
            />
          )}
        </>
      ) : (
        // AINDA NÃO ESTRUTURADO
        <div className="border border-dashed border-white/12 bg-surface px-[22px] py-14 text-center">
          <div className="disp text-[26px] text-muted-2">
            {ta.prontoEstruturar}
          </div>
          <p className="mx-auto mt-2 max-w-md font-cond text-[15px] uppercase tracking-[0.03em] text-muted-3">
            {ta.informePre}{" "}
            <span className="text-brand-soft">{ta.estruturarAreas}</span>{" "}
            {ta.informeDistribuir} {totalCategorias}{" "}
            {dic.admin.categorias.categorias} {ta.informeMontar}
          </p>
        </div>
      )}

      {/* TELA CHEIA */}
      {areasFull && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0B] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="disp text-[22px]">{ta.cronogramaPorArea}</span>
            <button
              type="button"
              onClick={() => setAreasFull(false)}
              className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
            >
              <span className="inline-block skew-x-9">
                ✕ {ta.fecharTelaCheia}
              </span>
            </button>
          </div>
          <ProgramacaoAreas
            cronograma={cronograma}
            layout="colunas"
            base={base}
            full
          />
        </div>
      )}

      {/* MODAL DE PLACAR (visualização) */}
      <ModalPlacar sel={lutaSel} onFechar={() => setLutaSel(null)} />
    </AbrirLutaCtx.Provider>
  );
}

function Stat({
  rotulo,
  valor,
  sub,
  destaque,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  destaque?: boolean;
}) {
  return (
    <div className="relative border border-white/10 bg-surface py-4 pl-6 pr-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
      <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
        {rotulo}
      </div>
      <div
        className={cn(
          "disp tnum mt-1.5 text-[38px] leading-none",
          destaque && "text-brand",
        )}
      >
        {valor}
      </div>
      <div className="mt-1.5 truncate font-cond text-[13px] uppercase tracking-[0.04em] text-muted-2">
        {sub}
      </div>
    </div>
  );
}
