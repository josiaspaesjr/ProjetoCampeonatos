/**
 * Classificação das lutas de uma chave de eliminação dupla — função pura, sem
 * banco. Usada pela visualização da chave e pela estimativa de cronograma para
 * não haver regras divergentes.
 *
 * Numa chave recém-gerada quase todas as lutas nascem "vazias" (sem atletas):
 * elas só recebem atletas conforme os resultados avançam pela chave de
 * vencedores (WB) e de perdedores (LB). Entre as lutas vazias há três casos:
 *
 *   • luta REAL futura — os dois lados serão preenchidos (é uma luta de fato);
 *   • WALKOVER futuro — só um lado será preenchido; o outro morreu num bye (a
 *     chave mostra a posição, mas não conta como luta no tempo do cronograma);
 *   • luta MORTA — nenhum lado será preenchido; deve sumir da chave.
 *
 * A distinção sai de um ponto-fixo sobre os elos reais de avanço
 * (proximaLuta = vencedor; proximaLutaPerdedor = perdedor). Um bye/walkover
 * entrega vencedor mas NÃO entrega perdedor, então o slot de destino do
 * perdedor de um bye nunca será preenchido — é o que mata a cascata da LB.
 */

/** Linha mínima de luta (compatível com a linha do banco e com o motor). */
export interface LinhaLutaDupla {
  id: string;
  atleta1InscricaoId: string | null;
  atleta2InscricaoId: string | null;
  vencedorInscricaoId: string | null;
  proximaLutaId: string | null;
  proximaLutaSlot: number | null;
  proximaLutaPerdedorId: string | null;
  proximaLutaPerdedorSlot: number | null;
}

export interface ClassificacaoDupla {
  /** ids das lutas que nunca terão atletas (bye em cascata) — ocultar na chave */
  mortas: Set<string>;
  /** ids das lutas com os dois lados garantidos — contam como luta no cronograma */
  reais: Set<string>;
}

/**
 * Para cada slot de cada luta decide se ele será preenchido algum dia (ponto-fixo
 * monotônico), e daí classifica cada luta:
 *   • nenhum slot vivo → morta;
 *   • os dois slots vivos → luta real;
 *   • só um slot vivo → walkover (nem morta nem real).
 */
export function classificarEliminacaoDupla(
  linhas: LinhaLutaDupla[],
): ClassificacaoDupla {
  const chaveSlot = (id: string, slot: 1 | 2) => `${id}#${slot}`;

  // fonte de cada slot: quem entrega o vencedor e quem entrega o perdedor
  const fonteVencedor = new Map<string, string>();
  const fontePerdedor = new Map<string, string>();
  for (const l of linhas) {
    if (l.proximaLutaId && (l.proximaLutaSlot === 1 || l.proximaLutaSlot === 2))
      fonteVencedor.set(chaveSlot(l.proximaLutaId, l.proximaLutaSlot), l.id);
    if (
      l.proximaLutaPerdedorId &&
      (l.proximaLutaPerdedorSlot === 1 || l.proximaLutaPerdedorSlot === 2)
    )
      fontePerdedor.set(
        chaveSlot(l.proximaLutaPerdedorId, l.proximaLutaPerdedorSlot),
        l.id,
      );
  }

  // vivo = o slot terá atleta algum dia. Semente: slots com atleta já definido.
  const vivo = new Set<string>();
  for (const l of linhas) {
    if (l.atleta1InscricaoId) vivo.add(chaveSlot(l.id, 1));
    if (l.atleta2InscricaoId) vivo.add(chaveSlot(l.id, 2));
  }
  // uma luta entrega vencedor se tem algum lado vivo; entrega perdedor só se tem
  // os dois lados (um bye/walkover não gera perdedor para cair na LB).
  const daVencedor = (id: string) =>
    vivo.has(chaveSlot(id, 1)) || vivo.has(chaveSlot(id, 2));
  const daPerdedor = (id: string) =>
    vivo.has(chaveSlot(id, 1)) && vivo.has(chaveSlot(id, 2));

  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const l of linhas) {
      for (const slot of [1, 2] as const) {
        const k = chaveSlot(l.id, slot);
        if (vivo.has(k)) continue;
        const fv = fonteVencedor.get(k);
        const fp = fontePerdedor.get(k);
        if ((fv && daVencedor(fv)) || (fp && daPerdedor(fp))) {
          vivo.add(k);
          mudou = true;
        }
      }
    }
  }

  const mortas = new Set<string>();
  const reais = new Set<string>();
  for (const l of linhas) {
    const v1 = vivo.has(chaveSlot(l.id, 1));
    const v2 = vivo.has(chaveSlot(l.id, 2));
    if (!v1 && !v2) mortas.add(l.id);
    else if (v1 && v2) reais.add(l.id);
  }
  return { mortas, reais };
}
