/**
 * Distribuição das categorias pelas áreas (tatames).
 *
 * A grade gerada é agrupada por `classe · sexo · faixa` — cada grupo é o
 * conjunto de brackets de peso daquela combinação. Os grupos são ordenados
 * numa "ordem do dia" que vai dos **extremos ao meio** da lista de classes
 * CBJJ (kids e masters mais velhos liberam cedo; o miolo — Adulto/Master 1 —
 * corre por último) e então distribuídos em round-robin pelas N áreas, de modo
 * que toda área comece pelos extremos e termine no centro, com carga próxima.
 */

import { CLASSES_IDADE, FAIXAS } from "./cbjj";

/** classe → índice na ordem CBJJ (Pré-Mirim 0 … Master 7 12) */
const IDX_CLASSE = new Map(CLASSES_IDADE.map((c, i) => [c.id, i]));
const NOME_CLASSE = new Map(CLASSES_IDADE.map((c) => [c.id, c.nome]));
const IDX_FAIXA = new Map(FAIXAS.map((f, i) => [f as string, i]));

/** nº de posições na régua de classes; base da simetria das ondas */
export const N_CLASSES = CLASSES_IDADE.length;

/** índice do meio da régua — para onde converge o funil (classe mais tardia) */
const IDX_CENTRO = Math.floor((N_CLASSES - 1) / 2);

export interface CategoriaParaAgrupar {
  id: string;
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  tipo: string;
  limitePesoKg: number | null;
}

export interface GrupoDeArea {
  /** `classeIdade|sexo|faixa` */
  chave: string;
  classeId: string;
  classeNome: string;
  classIndex: number;
  /** distância ao extremo mais próximo (0 = mais cedo; máx = centro/mais tarde) */
  onda: number;
  sexo: string;
  /** faixa ("" quando ausente) */
  faixa: string;
  beltIndex: number;
  /** ids das categorias do grupo, já ordenados leve→pesado→absoluto */
  categoriaIds: string[];
  /** nº de pesos (brackets) do grupo */
  pesos: number;
}

/** índice de classe, com fallback ao centro para classes fora da régua CBJJ */
function indiceClasse(classeId: string): number {
  return IDX_CLASSE.get(classeId) ?? IDX_CENTRO;
}

/**
 * Onda de uma classe: distância ao extremo mais próximo da régua. Os extremos
 * (Pré-Mirim e Master mais velho) valem 0 (correm cedo); o centro vale o máximo
 * (corre por último).
 */
export function ondaDaClasse(classeId: string): number {
  const idx = indiceClasse(classeId);
  return Math.min(idx, N_CLASSES - 1 - idx);
}

/** peso ordenável: leves→pesados, pesadíssimo (sem limite) e absoluto por último */
function rankPeso(c: CategoriaParaAgrupar): number {
  if (c.tipo === "absoluto") return 1_000_000;
  if (c.limitePesoKg == null) return 999_999;
  return c.limitePesoKg;
}

/**
 * Agrupa a grade por classe·sexo·faixa e devolve os grupos já na ordem do dia:
 * onda asc → faixa (branca→preta) → classe → sexo (masculino antes).
 */
export function agruparEOrdenar(cats: CategoriaParaAgrupar[]): GrupoDeArea[] {
  const porChave = new Map<string, CategoriaParaAgrupar[]>();
  for (const c of cats) {
    const chave = `${c.classeIdade}|${c.sexo}|${c.faixa ?? ""}`;
    const lista = porChave.get(chave);
    if (lista) lista.push(c);
    else porChave.set(chave, [c]);
  }

  const grupos: GrupoDeArea[] = [];
  for (const [chave, itens] of porChave) {
    const [classeId, sexo, faixa] = chave.split("|");
    const ordenadas = [...itens].sort((a, b) => rankPeso(a) - rankPeso(b));
    grupos.push({
      chave,
      classeId,
      classeNome: NOME_CLASSE.get(classeId) ?? classeId,
      classIndex: indiceClasse(classeId),
      onda: ondaDaClasse(classeId),
      sexo,
      faixa,
      beltIndex: IDX_FAIXA.get(faixa) ?? 99,
      categoriaIds: ordenadas.map((c) => c.id),
      pesos: ordenadas.length,
    });
  }

  grupos.sort(
    (a, b) =>
      a.onda - b.onda ||
      a.beltIndex - b.beltIndex ||
      a.classIndex - b.classIndex ||
      (a.sexo === b.sexo ? 0 : a.sexo === "masculino" ? -1 : 1),
  );
  return grupos;
}

/**
 * Round-robin dos grupos já ordenados nas N áreas (grupo i → área i % N).
 * Devolve um array de tamanho N com os grupos de cada área, preservando a
 * ordem do dia — logo cada área começa pelos extremos e afunila ao centro.
 */
export function distribuirEmAreas<T>(grupos: T[], n: number): T[][] {
  const areas: T[][] = Array.from({ length: Math.max(1, n) }, () => []);
  grupos.forEach((g, i) => areas[i % areas.length].push(g));
  return areas;
}

/** maior onda presente entre os grupos (mín. 1, para não dividir por zero) */
export function maiorOnda(grupos: { onda: number }[]): number {
  return Math.max(1, ...grupos.map((g) => g.onda));
}

/**
 * Cor do ponto de onda: vermelho forte nos extremos (onda 0), apagando até o
 * centro. `rgba(238,46,36, 1 − (onda/maiorOnda)·0.78)`.
 */
export function corDaOnda(onda: number, maiorOndaValor: number): string {
  const alpha = 1 - (maiorOndaValor > 0 ? onda / maiorOndaValor : 0) * 0.78;
  return `rgba(238,46,36,${alpha.toFixed(3)})`;
}
