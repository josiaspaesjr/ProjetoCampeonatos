"use client";


import { cn } from "@/lib/utils";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { useDic } from "@/lib/i18n/client";
import {
  CHAVES_TEMPO_FAIXA,
  CHAVES_TEMPO_KIDS,
  TEMPOS_PADRAO,
  TEMPO_MAX_MINUTOS,
  TEMPO_MIN_MINUTOS,
  type ChaveTempo,
} from "@/lib/cronograma/tempos";

/**
 * Tabela de **tempo de luta** do evento, na tela de Áreas: minutos
 * regulamentares por classe kids e por faixa adulto+. O valor vazio cai no
 * padrão CBJJ (mostrado como placeholder). Salvar reescreve `eventos.temposLuta`
 * e o cronograma, a fila do telão e o cronômetro do placar passam a usá-lo.
 */
export function CamposTemposLuta({
  valores,
  onChange,
}: {
  /** minutos efetivos por linha (padrão + o que o organizador mudou) */
  valores: Record<ChaveTempo, number>;
  /**
   * Avisa o rascunho a cada edição. O assistente de Áreas usa para o resumo do
   * passo e a recomendação acompanharem o que está sendo digitado, antes de
   * salvar. Sem ele o componente segue autônomo (só emite no FormData).
   */
  onChange?: (valores: Record<ChaveTempo, number>) => void;
}) {
  const dic = useDic();
  const ta = dic.admin.areas;

  const trocar = (chave: ChaveTempo, texto: string) => {
    const n = Number(texto);
    // vazio/inválido volta para o padrão CBJJ — mesma regra de `normalizarTempos`
    onChange?.({
      ...valores,
      [chave]: Number.isFinite(n) && n > 0 ? n : TEMPOS_PADRAO[chave],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl font-cond text-[13px] uppercase tracking-[0.02em] text-muted-3">
        {ta.temposTexto}
      </p>

      <Grupo titulo={ta.temposKids}>
        {CHAVES_TEMPO_KIDS.map((chave) => (
          <CampoTempo
            key={chave}
            chave={chave}
            rotulo={dic.classesIdade[chave] ?? chave}
            valor={valores[chave]}
            onChange={trocar}
            min={ta.temposMin}
            padrao={ta.temposPadrao}
          />
        ))}
      </Grupo>

      <Grupo titulo={ta.temposAdulto}>
        {CHAVES_TEMPO_FAIXA.map((chave) => (
          <CampoTempo
            key={chave}
            chave={chave}
            rotulo={
              dic.evento.faixaNomes[
                chave as keyof typeof dic.evento.faixaNomes
              ] ?? chave
            }
            cor={corDaFaixa(chave)}
            valor={valores[chave]}
            onChange={trocar}
            min={ta.temposMin}
            padrao={ta.temposPadrao}
          />
        ))}
      </Grupo>

      <p className="font-cond text-[12px] uppercase tracking-[0.03em] text-muted-3">
        {ta.temposNotaJuvenil}
      </p>
    </div>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
        {titulo}
      </div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

function CampoTempo({
  chave,
  rotulo,
  valor,
  onChange,
  cor,
  min,
  padrao,
}: {
  chave: ChaveTempo;
  rotulo: string;
  valor: number;
  onChange: (chave: ChaveTempo, texto: string) => void;
  /** cor da faixa (só nas linhas de faixa) */
  cor?: string;
  min: string;
  padrao: string;
}) {
  const ehPadrao = valor === TEMPOS_PADRAO[chave];

  return (
    <label className="flex w-[168px] flex-col gap-1 border border-white/10 bg-background p-3">
      <span className="flex min-w-0 items-center gap-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-text-2">
        {cor && (
          <span
            className="h-3 w-3 shrink-0 -skew-x-9 border border-white/25"
            style={{ background: cor }}
          />
        )}
        <span className="truncate">{rotulo}</span>
      </span>
      <span className="flex items-baseline gap-2">
        <input
          type="number"
          name={chave}
          min={TEMPO_MIN_MINUTOS}
          max={TEMPO_MAX_MINUTOS}
          step={1}
          value={String(valor)}
          onChange={(e) => onChange(chave, e.target.value)}
          placeholder={String(TEMPOS_PADRAO[chave])}
          className="disp tnum w-16 border border-white/14 bg-background px-2 py-0.5 text-[28px] leading-none text-foreground focus:border-brand focus:outline-none"
        />
        <span
          className={cn(
            "font-cond text-[12px] uppercase tracking-[0.05em]",
            ehPadrao ? "text-muted-3" : "text-brand-soft",
          )}
        >
          {min}
          {ehPadrao ? ` · ${padrao}` : ""}
        </span>
      </span>
    </label>
  );
}
