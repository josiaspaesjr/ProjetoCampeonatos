/** um pódio já resolvido em nomes, para somar no quadro */
export interface PodioResolvido {
  ouro: { nome: string; academia: string | null } | null;
  prata: { nome: string; academia: string | null } | null;
  bronzes: { nome: string; academia: string | null }[];
}

export interface LinhaQuadro {
  academia: string;
  ouro: number;
  prata: number;
  bronze: number;
  total: number;
}

/**
 * Quadro de medalhas por academia.
 *
 * Ordena como todo quadro olímpico: mais ouros primeiro, depois pratas, depois
 * bronzes — uma prata não compensa um ouro. Empate resolve pelo nome, para a
 * lista não dançar entre recarregamentos.
 *
 * Atleta sem academia entra num balde próprio (o chamador dá o rótulo), em vez
 * de sumir do quadro: a medalha existe mesmo sem equipe.
 */
export function quadroDeMedalhas(
  podios: PodioResolvido[],
  rotuloSemAcademia: string,
): LinhaQuadro[] {
  const porAcademia = new Map<string, LinhaQuadro>();

  const somar = (
    atleta: { academia: string | null } | null,
    medalha: "ouro" | "prata" | "bronze",
  ) => {
    if (!atleta) return;
    const nome = atleta.academia?.trim() || rotuloSemAcademia;
    const linha = porAcademia.get(nome) ?? {
      academia: nome,
      ouro: 0,
      prata: 0,
      bronze: 0,
      total: 0,
    };
    linha[medalha] += 1;
    linha.total += 1;
    porAcademia.set(nome, linha);
  };

  for (const p of podios) {
    somar(p.ouro, "ouro");
    somar(p.prata, "prata");
    for (const b of p.bronzes) somar(b, "bronze");
  }

  return [...porAcademia.values()].sort(
    (a, b) =>
      b.ouro - a.ouro ||
      b.prata - a.prata ||
      b.bronze - a.bronze ||
      a.academia.localeCompare(b.academia),
  );
}
