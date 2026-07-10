// Regras de vigência dos lotes — janelas de dias que não podem se sobrepor.
// Compartilhado entre o formulário (client) e a server action de criação, para
// os dois validarem exatamente igual (mesma ideia do preco.ts).
//
// Por que não deixar sobrepor: a inscrição pública cobra o preço do primeiro
// lote vigente por data; se duas janelas se cruzam, o preço do dia fica ambíguo.

/** janela de um lote em dias "yyyy-mm-dd" (limites inclusivos) */
export type JanelaLote = { nome: string; inicio: string; fim: string };

const p2 = (n: number) => String(n).padStart(2, "0");

/** dia local de uma Date como "yyyy-mm-dd" (mesma âncora local usada na criação) */
export function diaLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** "yyyy-mm-dd" → "dd/mm/aaaa" (sem passar por Date, evita fuso); "—" se incompleto */
export function ymdParaBR(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "—";
}

/**
 * Duas janelas de dias [aInicio..aFim] e [bInicio..bFim] se sobrepõem?
 * Limites inclusivos; comparação lexicográfica em "yyyy-mm-dd" já é cronológica.
 * Dias adjacentes (ex.: fim 17 / próximo início 18) NÃO se sobrepõem.
 */
export function diasSobrepoem(
  aInicio: string,
  aFim: string,
  bInicio: string,
  bFim: string,
): boolean {
  return aInicio <= bFim && bInicio <= aFim;
}

/**
 * Primeiro lote existente cuja janela colide com a do candidato, ou null.
 * Um lote não pode começar nem terminar dentro de outro: cada dia pertence a no
 * máximo um lote. Datas incompletas do candidato não acusam conflito.
 */
export function loteConflitante(
  candidato: { inicio: string; fim: string },
  existentes: JanelaLote[],
): JanelaLote | null {
  const inicio = candidato.inicio.slice(0, 10);
  const fim = candidato.fim.slice(0, 10);
  if (!inicio || !fim) return null;
  return existentes.find((l) => diasSobrepoem(inicio, fim, l.inicio, l.fim)) ?? null;
}

/**
 * Para cada janela da lista, os nomes das OUTRAS janelas cujo período se
 * sobrepõe ao dela. Índice i → nomes conflitantes (vazio = sem conflito).
 * Sinaliza na lista sobreposições que já existem no banco (a validação de
 * criação só barra as novas).
 */
export function conflitosNaLista(janelas: JanelaLote[]): string[][] {
  return janelas.map((a, i) =>
    janelas
      .filter((b, j) => j !== i && diasSobrepoem(a.inicio, a.fim, b.inicio, b.fim))
      .map((b) => b.nome),
  );
}
