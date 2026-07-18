/**
 * RNG determinístico com seed em string (xmur3 + mulberry32).
 * Garante que o sorteio da chave seja reproduzível e auditável.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function criarRng(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/** Fisher–Yates com RNG semeado; não muta o array original */
export function embaralhar<T>(itens: readonly T[], rng: () => number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Embaralha e agrupa por chave (ex.: academia) em blocos contíguos, maiores
 * primeiro. Assim, ao mapear para seeds consecutivos, o seeding padrão espalha
 * cada academia por quartas diferentes (eliminação dupla/colocação); e na
 * distribuição por `i % nGrupos` (multistage) cada academia é repartida entre
 * grupos. Determinístico pelo rng.
 */
export function agruparPorChave<T>(
  itens: readonly T[],
  rng: () => number,
  chave: (item: T, i: number) => string,
): T[] {
  const base = embaralhar(itens, rng);
  const buckets = new Map<string, T[]>();
  base.forEach((item, i) => {
    const k = chave(item, i);
    const b = buckets.get(k);
    if (b) b.push(item);
    else buckets.set(k, [item]);
  });
  return [...buckets.values()].sort((a, b) => b.length - a.length).flat();
}
