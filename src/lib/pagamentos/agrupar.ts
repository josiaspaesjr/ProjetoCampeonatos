/** cobrança em aberto e as inscrições que ela cobre */
export interface CobrancaViva {
  id: string;
  inscricaoIds: string[];
}

/**
 * Qual cobrança viva pode ser reaproveitada para pagar TODAS as inscrições
 * pendentes de um campeonato.
 *
 * Só serve a que cobre exatamente esse conjunto. Uma que cobre parte dele não
 * vale: o atleta pagaria e continuaria devendo o resto. E uma que cobre mais
 * do que está pendente também não — sobra ali inscrição já paga ou cancelada.
 *
 * Quando nenhuma serve, o chamador cria uma nova. A antiga continua viva no
 * gateway (não há cancelamento na interface), mas a interface só oferece a
 * nova — e se a antiga for paga, ela confirma as inscrições dela e a nova
 * cobre o que sobrar.
 */
export function cobrancaQueCobre(
  vivas: CobrancaViva[],
  pendentes: string[],
): string | null {
  const alvo = new Set(pendentes);
  if (alvo.size === 0) return null;
  const cobre = vivas.find((c) => {
    const dela = new Set(c.inscricaoIds);
    return dela.size === alvo.size && [...alvo].every((id) => dela.has(id));
  });
  return cobre?.id ?? null;
}
