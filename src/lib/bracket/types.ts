/**
 * Motor de chaveamento — tipos.
 *
 * Módulo puro: nenhuma dependência de banco ou framework.
 * Entrada: lista de inscritos + opções. Saída: árvore de lutas.
 */

export interface Inscrito {
  id: string;
  nome?: string;
  /** usada para afastar ao máximo atletas da mesma academia na chave */
  academiaId?: string | null;
}

export type MetodoVitoria =
  | "pontos"
  | "vantagens"
  | "finalizacao"
  | "decisao"
  | "wo"
  | "dq";

export interface Luta {
  /** id local dentro da chave, ex.: "r1p0" (rodada 1, posição 0) */
  id: string;
  rodada: number;
  posicao: number;
  atleta1: string | null;
  atleta2: string | null;
  /** id da luta para onde o vencedor avança; null na final */
  proximaLutaId: string | null;
  /** slot que o vencedor ocupa na próxima luta: 1 ou 2 */
  proximaLutaSlot: 1 | 2 | null;
  vencedor: string | null;
  metodo: MetodoVitoria | null;
  /** true quando a luta foi decidida por bye (sem oponente) */
  bye: boolean;
}

export interface Chave {
  formato: "eliminacao_simples" | "round_robin";
  /** seed usada no sorteio — mesma seed + mesmos inscritos = mesma chave */
  seed: string;
  /** total de rodadas (log2 do tamanho da chave) */
  rodadas: number;
  lutas: Luta[];
}

export interface OpcoesGeracao {
  /** seed do sorteio; obrigatória para auditabilidade */
  seed: string;
  /** afastar atletas da mesma academia o máximo possível na chave. default: true */
  separarAcademias?: boolean;
}

export interface Podio {
  primeiro: string | null;
  segundo: string | null;
  /** nas artes marciais de combate há dois terceiros lugares (perdedores das semifinais) */
  terceiros: string[];
}
