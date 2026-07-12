/**
 * Prazo para pagar uma inscrição pendente.
 *
 * O atleta pode se inscrever e pagar depois, mas só até o último dia de
 * inscrição do campeonato: `inscricoesFecham`. Quando o evento não define esse
 * limite, cai no fim do último lote de inscrição.
 */

export interface EventoPrazo {
  inscricoesFecham: Date | null;
}

export interface LotePrazo {
  fim: Date;
}

/** Data-limite para pagar (inclusive); nulo = sem limite conhecido. */
export function prazoDePagamento(
  evento: EventoPrazo,
  lotes: LotePrazo[] = [],
): Date | null {
  if (evento.inscricoesFecham) return evento.inscricoesFecham;
  if (lotes.length === 0) return null;
  return lotes.reduce(
    (maior, l) => (l.fim > maior ? l.fim : maior),
    lotes[0].fim,
  );
}

/** O pagamento ainda pode ser feito em `agora`? Sem prazo conhecido, libera. */
export function dentroDoPrazoDePagamento(
  evento: EventoPrazo,
  lotes: LotePrazo[] = [],
  agora: Date = new Date(),
): boolean {
  const prazo = prazoDePagamento(evento, lotes);
  return prazo === null || agora <= prazo;
}
