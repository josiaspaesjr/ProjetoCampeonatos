/**
 * Detecção de byes numa chave de eliminação simples — função pura, sem banco.
 *
 * Usada em todos os lugares que precisam distinguir bye de luta real
 * (persistência, visualização da chave e cronograma por área) para não haver
 * regras divergentes.
 */

/** Linha mínima de luta (compatível com a linha do banco e com o motor). */
export interface LinhaLutaBye {
  id: string;
  rodada: number;
  posicao: number;
  atleta1InscricaoId: string | null;
  atleta2InscricaoId: string | null;
}

/**
 * Ids das lutas que são "bye" (avanço sem oponente).
 *
 * No chaveamento de byes mínimos a 1ª rodada emparelha o máximo de atletas
 * (todos, quando o total é par) e os byes só surgem na rodada em que a
 * contagem de vencedores fica ímpar — sempre no último nó da rodada. Logo:
 *   • 1ª rodada → bye = nó com exatamente um atleta (o ímpar sem par);
 *   • demais    → bye = último nó, quando a rodada anterior tem nº ímpar de
 *                 nós (sobra um vencedor sem adversário).
 *
 * Também reconhece o formato antigo (chave por potência de 2, com vários byes
 * espalhados na 1ª rodada): lá a rodada anterior sempre tem nº par de nós, então
 * só a regra da 1ª rodada dispara — compatível com chaves já geradas.
 *
 * Round robin não tem bye (a luta simplesmente não existe): retorna vazio.
 */
export function idsDeBye(linhas: LinhaLutaBye[], formato: string): Set<string> {
  if (formato !== "eliminacao_simples") return new Set();

  const nosPorRodada = new Map<number, number>();
  const ultimaPosicao = new Map<number, number>();
  for (const l of linhas) {
    nosPorRodada.set(l.rodada, (nosPorRodada.get(l.rodada) ?? 0) + 1);
    ultimaPosicao.set(
      l.rodada,
      Math.max(ultimaPosicao.get(l.rodada) ?? -1, l.posicao),
    );
  }

  const byes = new Set<string>();
  for (const l of linhas) {
    const ehBye =
      l.rodada === 1
        ? (l.atleta1InscricaoId === null) !== (l.atleta2InscricaoId === null)
        : (nosPorRodada.get(l.rodada - 1) ?? 0) % 2 === 1 &&
          l.posicao === ultimaPosicao.get(l.rodada);
    if (ehBye) byes.add(l.id);
  }
  return byes;
}
