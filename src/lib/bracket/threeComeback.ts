import { criarRng, embaralhar } from "./rng";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

/**
 * 3 atletas com repescagem — formato para divisões de exatamente 3, garantindo
 * que cada um lute ao menos duas vezes antes da decisão:
 *   • M1 (rodada 1): A × B — vencedor vai à final; perdedor cai na repescagem
 *   • M2 (repescagem, rodada 1): C × perdedor(M1) — vencedor vai à final
 *   • M3 (final, rodada 2): vencedor(M1) × vencedor(M2)
 * Pódio: campeão = vencedor(M3); 2º = perdedor(M3); 3º = perdedor(M2).
 *
 * O avanço do vencedor usa proximaLuta (como na eliminação); o do perdedor de
 * M1 para a repescagem é resolvido aqui no registrador (estrutura fixa, sem
 * precisar de coluna de rota do perdedor no banco).
 */
export function gerarTresRepescagem(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length !== 3) {
    throw new Error("3 com repescagem exige exatamente 3 atletas");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== 3) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const [a, b, c] = embaralhar(inscritos, rng);
  const lutas: Luta[] = [
    {
      id: "m1",
      rodada: 1,
      posicao: 0,
      atleta1: a.id,
      atleta2: b.id,
      proximaLutaId: "m3",
      proximaLutaSlot: 1,
      vencedor: null,
      metodo: null,
      bye: false,
    },
    {
      id: "m2",
      rodada: 1,
      posicao: 1,
      atleta1: c.id,
      atleta2: null, // preenchido com o perdedor de M1
      proximaLutaId: "m3",
      proximaLutaSlot: 2,
      vencedor: null,
      metodo: null,
      bye: false,
    },
    {
      id: "m3",
      rodada: 2,
      posicao: 0,
      atleta1: null,
      atleta2: null,
      proximaLutaId: null,
      proximaLutaSlot: null,
      vencedor: null,
      metodo: null,
      bye: false,
    },
  ];

  return { formato: "tres_repescagem", seed: opcoes.seed, rodadas: 2, lutas };
}

const acharFinal = (chave: Chave): Luta =>
  chave.lutas.find((l) => l.proximaLutaId === null)!;
const acharM1 = (chave: Chave): Luta =>
  chave.lutas.find((l) => l.rodada === 1 && l.proximaLutaSlot === 1)!;
const acharM2 = (chave: Chave): Luta =>
  chave.lutas.find((l) => l.rodada === 1 && l.proximaLutaSlot === 2)!;

/**
 * Registra o resultado de uma luta: avança o vencedor à final e, quando M1 é
 * decidida, joga o perdedor na repescagem (M2). Correção bloqueada após a final
 * decidida. Não muta a original.
 */
export function registrarResultadoTresRepescagem(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const luta = nova.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  if (!luta.atleta1 || !luta.atleta2) {
    throw new Error("A luta ainda não tem os dois atletas definidos");
  }
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }
  const final = acharFinal(nova);
  if (luta.id !== final.id && final.vencedor) {
    throw new Error(
      "Resultado não pode ser corrigido: a final já foi decidida",
    );
  }

  luta.vencedor = vencedorId;
  luta.metodo = metodo;
  const perdedor = vencedorId === luta.atleta1 ? luta.atleta2 : luta.atleta1;

  // avança o vencedor para a final
  if (luta.proximaLutaId) {
    const prox = nova.lutas.find((l) => l.id === luta.proximaLutaId)!;
    if (luta.proximaLutaSlot === 1) prox.atleta1 = vencedorId;
    else prox.atleta2 = vencedorId;
  }
  // perdedor de M1 → repescagem (M2)
  if (luta.id === acharM1(nova).id) {
    const m2 = acharM2(nova);
    if (m2.atleta2 === null) m2.atleta2 = perdedor;
  }

  return nova;
}

/** true quando a final foi decidida. */
export function tresRepescagemConcluida(chave: Chave): boolean {
  return acharFinal(chave).vencedor !== null;
}

/** Pódio: 1º vencedor da final, 2º perdedor da final, 3º perdedor da repescagem. */
export function podioTresRepescagem(chave: Chave): Podio {
  const final = acharFinal(chave);
  const m2 = acharM2(chave);
  const perdedorDe = (l: Luta): string | null =>
    l.vencedor === null
      ? null
      : l.vencedor === l.atleta1
        ? l.atleta2
        : l.atleta1;
  const terceiro = perdedorDe(m2);
  return {
    primeiro: final.vencedor,
    segundo: perdedorDe(final),
    terceiros: terceiro ? [terceiro] : [],
  };
}
