"use client";

import {
  situacaoRecomendacao,
  type RecomendacaoAreas,
} from "@/lib/cronograma/recomendacao";
import { formatarDuracaoSegundos } from "@/lib/cronograma/dias";
import { useDic } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Tom = "ok" | "alerta" | "neutro";

/**
 * Widget "quantos tatames o evento precisa": compara as lutas previstas com a
 * janela de cada dia (início → término) e recomenda o menor nº de tatames em
 * que tudo cabe. Sai do mesmo motor que valida o "Estruturar", então o número
 * daqui é exatamente o que faz o gerador passar.
 */
export function RecomendacaoAreasWidget({ dados }: { dados: RecomendacaoAreas }) {
  const t = useDic().admin.areas.recomendacao;
  const {
    ideal,
    atual,
    lutasPrevistas,
    demandaTotalSegundos,
    janelaPorAreaSegundos,
    ocupacaoNoIdeal,
    soAdicionandoTempo,
    areasMax,
  } = dados;

  const situacao = situacaoRecomendacao(dados);
  /** há um número a recomendar? (senão o widget vira só o recado) */
  const temNumero = situacao !== "semDados" && situacao !== "impossivel";

  /** "1 tatame" / "3 tatames" — o verbo de cada frase concorda à parte */
  const nTatames = (n: number) =>
    `${n} ${n === 1 ? t.unidade : t.unidadePlural}`;

  const TOM: Record<typeof situacao, Tom> = {
    semDados: "neutro",
    impossivel: "alerta",
    comece: "neutro",
    faltam: "alerta",
    sobram: "ok",
    bate: "ok",
  };
  const tom = TOM[situacao];

  let recado: string;
  switch (situacao) {
    case "semDados":
      recado = t.semInscricoes;
      break;
    case "impossivel":
      recado = soAdicionandoTempo
        ? t.soMaisTempo
        : `${t.nemComPre}${nTatames(areasMax)}${t.nemComPos}`;
      break;
    case "comece":
      recado = `${t.comecePre}${nTatames(ideal!)}${
        ideal === 1 ? t.comeceFimSing : t.comeceFimPlural
      }`;
      break;
    case "faltam":
      recado = `${t.faltamPre}${nTatames(atual!)}${t.faltamMeio}${nTatames(ideal!)}${t.faltamPos}`;
      break;
    case "sobram":
      recado = `${t.sobramPre}${nTatames(atual!)}${t.sobramMeio}${nTatames(ideal!)}${
        ideal === 1 ? t.sobramFimSing : t.sobramFimPlural
      }`;
      break;
    default:
      recado = `${nTatames(atual!)}${
        atual === 1 ? t.bateFimSing : t.bateFimPlural
      }`;
  }

  const corTom =
    tom === "ok"
      ? "text-success"
      : tom === "alerta"
        ? "text-warning-foreground"
        : "text-muted-2";
  const pct = Math.min(100, Math.round(ocupacaoNoIdeal * 100));

  return (
    <section className="relative border border-white/10 bg-surface px-6 py-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />

      <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
        {t.titulo}
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-8 gap-y-4">
        {/* NÚMERO RECOMENDADO — some quando não há número a dar */}
        {temNumero && (
          <div className="shrink-0">
            <div className="disp tnum text-[52px] leading-none text-brand">
              {ideal}
            </div>
            <div className="mt-1 font-cond text-[13px] uppercase tracking-[0.06em] text-muted-2">
              {ideal === 1 ? t.tatameIdeal : t.tatamesIdeais}
            </div>
          </div>
        )}

        {/* RECADO + OCUPAÇÃO */}
        <div className="min-w-[240px] flex-1">
          <p className={cn("text-sm leading-snug", corTom)}>{recado}</p>

          {temNumero && (
            <div className="mt-3">
              <div
                className="h-1.5 w-full overflow-hidden bg-white/10"
                role="img"
                aria-label={`${pct}% ${t.ocupacaoLabel}`}
              >
                <div
                  className={cn(
                    "h-full",
                    pct >= 90 ? "bg-warning" : "bg-brand",
                  )}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <p className="mt-1.5 font-cond text-[12px] uppercase tracking-[0.04em] text-muted-3">
                {pct}% {t.ocupacaoLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BASE DO CÁLCULO */}
      <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 border-t border-white/8 pt-3.5 font-cond text-[12px] uppercase tracking-[0.04em]">
        <Fato rotulo={t.lutasPrevistas} valor={String(lutasPrevistas)} />
        <Fato
          rotulo={t.tempoDeLuta}
          valor={formatarDuracaoSegundos(demandaTotalSegundos)}
        />
        <Fato
          rotulo={t.janelaPorTatame}
          valor={formatarDuracaoSegundos(janelaPorAreaSegundos)}
        />
      </dl>
    </section>
  );
}

function Fato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-3">{rotulo}</dt>
      <dd className="tnum font-semibold text-foreground">{valor}</dd>
    </div>
  );
}
