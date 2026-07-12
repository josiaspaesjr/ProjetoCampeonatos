/**
 * Distribuição das categorias pelas áreas (tatames).
 *
 * A unidade distribuída é a **categoria** (um bracket = um tatame): elas são
 * ordenadas numa "ordem do dia" que vai dos **extremos ao meio** da régua de
 * classes CBJJ (kids e masters mais velhos liberam cedo; o miolo —
 * Adulto/Master 1 — corre por último) e então alocadas por **menor carga**
 * (greedy) nas áreas. Assim nenhuma área fica vazia enquanto houver categorias
 * suficientes, a carga (nº de lutas × duração) fica equilibrada entre as áreas
 * e cada área mantém a ordem do dia. Para exibir, as categorias de cada área
 * voltam a ser agrupadas por `classe · sexo · faixa`.
 */

import { CLASSES_IDADE, FAIXAS } from "./cbjj";

const IDX_CLASSE = new Map(CLASSES_IDADE.map((c, i) => [c.id, i]));
const NOME_CLASSE = new Map(CLASSES_IDADE.map((c) => [c.id, c.nome]));
const IDX_FAIXA = new Map(FAIXAS.map((f, i) => [f as string, i]));

/** nº de posições na régua de classes; base da simetria das ondas */
export const N_CLASSES = CLASSES_IDADE.length;

/** índice do meio da régua — para onde converge o funil (classe mais tardia) */
const IDX_CENTRO = Math.floor((N_CLASSES - 1) / 2);

/** índice de classe, com fallback ao centro para classes fora da régua CBJJ */
function indiceClasse(classeId: string): number {
  return IDX_CLASSE.get(classeId) ?? IDX_CENTRO;
}

/** nome legível da classe (fallback ao próprio id) */
export function nomeDaClasse(classeId: string): string {
  return NOME_CLASSE.get(classeId) ?? classeId;
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

/** chave do grupo de exibição de uma categoria */
export function chaveDoGrupo(c: { classeIdade: string; sexo: string; faixa: string | null }): string {
  return `${c.classeIdade}|${c.sexo}|${c.faixa ?? ""}`;
}

/** peso ordenável: leves→pesados, pesadíssimo (sem limite) e absoluto por último */
function rankPeso(c: { tipo: string; limitePesoKg: number | null }): number {
  if (c.tipo === "absoluto") return 1_000_000;
  if (c.limitePesoKg == null) return 999_999;
  return c.limitePesoKg;
}

const sexoRank = (sexo: string) => (sexo === "masculino" ? 0 : 1);

/** categoria mínima para ordenar na ordem do dia */
export interface CategoriaOrdenavel {
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  tipo: string;
  limitePesoKg: number | null;
}

/** categoria com carga estimada (segundos) para o balanceamento */
export interface CategoriaComCarga {
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  /** carga estimada em segundos (nº de lutas × duração) — sempre > 0 */
  carga: number;
}

/**
 * Ordena as categorias na ordem do dia: onda asc (extremos primeiro) → faixa
 * (branca→preta) → classe → sexo (masculino antes) → peso (leve→pesado).
 */
export function ordenarCategorias<T extends CategoriaOrdenavel>(cats: T[]): T[] {
  return [...cats].sort(
    (a, b) =>
      ondaDaClasse(a.classeIdade) - ondaDaClasse(b.classeIdade) ||
      (IDX_FAIXA.get(a.faixa ?? "") ?? 99) - (IDX_FAIXA.get(b.faixa ?? "") ?? 99) ||
      indiceClasse(a.classeIdade) - indiceClasse(b.classeIdade) ||
      sexoRank(a.sexo) - sexoRank(b.sexo) ||
      rankPeso(a) - rankPeso(b),
  );
}

/**
 * Aloca as categorias (já na ordem do dia) nas N áreas por **menor carga**:
 * cada categoria vai para a área menos carregada no momento (empate → menor
 * índice). Como todas as áreas começam zeradas, as primeiras N categorias caem
 * uma em cada área — portanto nenhuma área fica vazia enquanto houver ao menos
 * N categorias. Cada área preserva a ordem do dia (as categorias entram na
 * ordem recebida).
 */
export function distribuirBalanceado<T extends { carga: number }>(
  cats: T[],
  n: number,
): T[][] {
  const total = Math.max(1, n);
  const areas: T[][] = Array.from({ length: total }, () => []);
  const carga = new Array<number>(total).fill(0);
  for (const c of cats) {
    let alvo = 0;
    for (let i = 1; i < total; i++) {
      if (carga[i] < carga[alvo]) alvo = i;
    }
    areas[alvo].push(c);
    carga[alvo] += Math.max(1, c.carga);
  }
  return areas;
}

export interface GrupoExibicao {
  chave: string;
  classeNome: string;
  onda: number;
  sexo: string;
  /** faixa ("" quando ausente) */
  faixa: string;
  /** nº de categorias (pesos) do grupo nesta área */
  pesos: number;
}

/**
 * Reagrupa uma lista de categorias (assumida já na ordem do dia) por
 * `classe · sexo · faixa` para exibição — a ordem dos grupos segue a primeira
 * aparição (ordem do dia).
 */
export function agruparExibicao<
  T extends { classeIdade: string; sexo: string; faixa: string | null },
>(cats: T[]): GrupoExibicao[] {
  const grupos = new Map<string, GrupoExibicao>();
  for (const c of cats) {
    const chave = chaveDoGrupo(c);
    const existente = grupos.get(chave);
    if (existente) {
      existente.pesos++;
    } else {
      grupos.set(chave, {
        chave,
        classeNome: nomeDaClasse(c.classeIdade),
        onda: ondaDaClasse(c.classeIdade),
        sexo: c.sexo,
        faixa: c.faixa ?? "",
        pesos: 1,
      });
    }
  }
  return [...grupos.values()];
}

/** classes distintas na ordem do dia (para a legenda do funil) */
export function classesEmOrdem<T extends { classeIdade: string }>(
  cats: T[],
): { id: string; nome: string; onda: number }[] {
  const vistas = new Map<string, number>();
  for (const c of cats) {
    if (!vistas.has(c.classeIdade))
      vistas.set(c.classeIdade, ondaDaClasse(c.classeIdade));
  }
  return [...vistas].map(([id, onda]) => ({
    id,
    nome: nomeDaClasse(id),
    onda,
  }));
}

/** maior onda presente (mín. 1, para não dividir por zero na cor) */
export function maiorOndaDeCats<T extends { classeIdade: string }>(cats: T[]): number {
  return Math.max(1, ...cats.map((c) => ondaDaClasse(c.classeIdade)));
}

/** nº de grupos distintos (classe·sexo·faixa) na grade */
export function contarGrupos<
  T extends { classeIdade: string; sexo: string; faixa: string | null },
>(cats: T[]): number {
  return new Set(cats.map(chaveDoGrupo)).size;
}

/**
 * Cor do ponto de onda: vermelho forte nos extremos (onda 0), apagando até o
 * centro. `rgba(238,46,36, 1 − (onda/maiorOnda)·0.78)`.
 */
export function corDaOnda(onda: number, maiorOndaValor: number): string {
  const alpha = 1 - (maiorOndaValor > 0 ? onda / maiorOndaValor : 0) * 0.78;
  return `rgba(238,46,36,${alpha.toFixed(3)})`;
}
