/**
 * Tempo regulamentar de luta.
 *
 * A tabela tem duas metades: as classes **kids** valem pela CLASSE de idade
 * (todas as faixas da classe lutam o mesmo tempo) e o resto (juvenil, adulto e
 * masters) vale pela FAIXA. O organizador pode sobrescrever qualquer linha por
 * evento (`eventos.temposLuta`), e uma categoria específica ainda pode ter sua
 * própria duração (`categorias.duracaoLutaSegundos`) — ver `duracaoDaCategoria`.
 *
 * Os valores são MINUTOS regulamentares (sem a transição entre lutas, que o
 * cronograma soma à parte — ver TRANSICAO_SEGUNDOS em fila.ts).
 */

/** linhas configuráveis: classes kids (por idade) + faixas adulto+ (por faixa) */
export const CHAVES_TEMPO = [
  "pre_mirim",
  "mirim",
  "infantil",
  "infanto_juvenil",
  "branca",
  "azul",
  "roxa",
  "marrom",
  "preta",
] as const;

export type ChaveTempo = (typeof CHAVES_TEMPO)[number];

/** classes kids: o tempo vale para a classe inteira, qualquer que seja a faixa */
export const CHAVES_TEMPO_KIDS = [
  "pre_mirim",
  "mirim",
  "infantil",
  "infanto_juvenil",
] as const satisfies readonly ChaveTempo[];

/** faixas adulto+ (juvenil, adulto e masters seguem a faixa) */
export const CHAVES_TEMPO_FAIXA = [
  "branca",
  "azul",
  "roxa",
  "marrom",
  "preta",
] as const satisfies readonly ChaveTempo[];

/** minutos regulamentares padrão (tabela CBJJ) */
export const TEMPOS_PADRAO: Record<ChaveTempo, number> = {
  pre_mirim: 2,
  mirim: 3,
  infantil: 4,
  infanto_juvenil: 4,
  branca: 5,
  azul: 6,
  roxa: 7,
  marrom: 8,
  preta: 10,
};

/** linha usada quando a categoria não casa com nenhuma (faixa kids fora de classe kids) */
const CHAVE_FALLBACK: ChaveTempo = "azul";

/** limites aceitos ao salvar (minutos) — evita 0 e valores absurdos no encaixe */
export const TEMPO_MIN_MINUTOS = 1;
export const TEMPO_MAX_MINUTOS = 60;

/** config por evento: minutos por linha (só o que o organizador definiu) */
export type TemposLuta = Partial<Record<ChaveTempo, number>>;

const KIDS = new Set<string>(CHAVES_TEMPO_KIDS);
const FAIXAS = new Set<string>(CHAVES_TEMPO_FAIXA);

/** categoria vista pela tabela de tempos */
export interface CategoriaTempo {
  classeIdade?: string | null;
  faixa: string | null;
}

/** qual linha da tabela vale para a categoria: kids pela classe, resto pela faixa */
export function chaveDoTempo(cat: CategoriaTempo): ChaveTempo {
  const classe = cat.classeIdade ?? "";
  if (KIDS.has(classe)) return classe as ChaveTempo;
  const faixa = cat.faixa ?? "";
  if (FAIXAS.has(faixa)) return faixa as ChaveTempo;
  return CHAVE_FALLBACK;
}

/** minutos regulamentares da categoria: config do evento > tabela padrão */
export function minutosDaCategoria(
  cat: CategoriaTempo,
  tempos?: TemposLuta | null,
): number {
  const chave = chaveDoTempo(cat);
  const configurado = tempos?.[chave];
  return valido(configurado) ? configurado : TEMPOS_PADRAO[chave];
}

/** minuto aceito: inteiro dentro dos limites (protege contra JSON velho/torto) */
function valido(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isFinite(v) &&
    v >= TEMPO_MIN_MINUTOS &&
    v <= TEMPO_MAX_MINUTOS
  );
}

/**
 * Normaliza o que veio do formulário: mantém só as linhas conhecidas e dentro
 * dos limites, arredondando para minutos inteiros. Linha igual ao padrão é
 * descartada — o JSON guarda apenas o que o organizador mudou de fato.
 */
export function normalizarTempos(
  entrada: Record<string, unknown> | null | undefined,
): TemposLuta {
  const saida: TemposLuta = {};
  if (!entrada) return saida;
  for (const chave of CHAVES_TEMPO) {
    const bruto = entrada[chave];
    const num =
      typeof bruto === "string" ? Number(bruto.replace(",", ".")) : bruto;
    if (typeof num !== "number" || !Number.isFinite(num)) continue;
    const minutos = Math.round(num);
    if (!valido(minutos) || minutos === TEMPOS_PADRAO[chave]) continue;
    saida[chave] = minutos;
  }
  return saida;
}

/** tabela completa (padrão + overrides) para exibir no formulário */
export function temposEfetivos(tempos?: TemposLuta | null): Record<ChaveTempo, number> {
  const saida = { ...TEMPOS_PADRAO };
  for (const chave of CHAVES_TEMPO) {
    const v = tempos?.[chave];
    if (valido(v)) saida[chave] = v;
  }
  return saida;
}
