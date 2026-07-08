import { criarRng, embaralhar } from "./rng";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

function proximaPotenciaDe2(n: number): number {
  return 2 ** Math.ceil(Math.log2(n));
}

function idLuta(rodada: number, posicao: number): string {
  return `r${rodada}p${posicao}`;
}

/**
 * Distribui os inscritos nos slots da 1ª rodada.
 *
 * - Lutas de bye (capacidade 1) são espalhadas uniformemente pela chave.
 * - Atletas da mesma academia são separados em lutas diferentes (best effort):
 *   grupos maiores são alocados primeiro, cada atleta vai para a luta com
 *   menos colegas de academia e mais capacidade livre.
 */
function distribuirPrimeiraRodada(
  inscritos: Inscrito[],
  totalLutas: number,
  byes: number,
  separarAcademias: boolean,
  rng: () => number,
): Array<[Inscrito | null, Inscrito | null]> {
  // capacidade por luta: byes espalhados uniformemente
  const capacidade = new Array<number>(totalLutas).fill(2);
  for (let i = 0; i < byes; i++) {
    capacidade[Math.floor((i * totalLutas) / byes)] = 1;
  }

  const sorteados = embaralhar(inscritos, rng);

  let ordemAlocacao: Inscrito[];
  if (separarAcademias) {
    // agrupa por academia (sem academia = grupo individual) e aloca os
    // grupos maiores primeiro, quando ainda há lutas livres para separá-los
    const grupos = new Map<string, Inscrito[]>();
    sorteados.forEach((insc, i) => {
      const chaveGrupo = insc.academiaId ?? `__sem_academia_${i}`;
      grupos.set(chaveGrupo, [...(grupos.get(chaveGrupo) ?? []), insc]);
    });
    ordemAlocacao = [...grupos.values()]
      .sort((a, b) => b.length - a.length)
      .flat();
  } else {
    ordemAlocacao = sorteados;
  }

  const lutas: Array<Array<Inscrito | null>> = Array.from(
    { length: totalLutas },
    () => [],
  );

  for (const inscrito of ordemAlocacao) {
    let melhor = -1;
    let melhorScore: [number, number] | null = null;
    for (let i = 0; i < totalLutas; i++) {
      if (lutas[i].length >= capacidade[i]) continue;
      const colegas =
        separarAcademias && inscrito.academiaId
          ? lutas[i].filter((o) => o?.academiaId === inscrito.academiaId).length
          : 0;
      const score: [number, number] = [colegas, lutas[i].length];
      if (
        melhorScore === null ||
        score[0] < melhorScore[0] ||
        (score[0] === melhorScore[0] && score[1] < melhorScore[1])
      ) {
        melhor = i;
        melhorScore = score;
      }
    }
    lutas[melhor].push(inscrito);
  }

  return lutas.map((l) => [l[0] ?? null, l[1] ?? null]);
}

/**
 * Gera uma chave de eliminação simples.
 *
 * Determinística: mesma seed + mesmos inscritos (mesma ordem) = mesma chave.
 * Byes avançam automaticamente para a 2ª rodada.
 */
export function gerarEliminacaoSimples(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length < 2) {
    throw new Error("É preciso ao menos 2 inscritos para gerar uma chave");
  }
  const ids = new Set(inscritos.map((i) => i.id));
  if (ids.size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }

  const separarAcademias = opcoes.separarAcademias ?? true;
  const rng = criarRng(opcoes.seed);

  const tamanho = proximaPotenciaDe2(inscritos.length);
  const rodadas = Math.log2(tamanho);
  const byes = tamanho - inscritos.length;

  const primeiraRodada = distribuirPrimeiraRodada(
    inscritos,
    tamanho / 2,
    byes,
    separarAcademias,
    rng,
  );

  const lutas: Luta[] = [];
  for (let r = 1; r <= rodadas; r++) {
    const totalNaRodada = tamanho / 2 ** r;
    for (let p = 0; p < totalNaRodada; p++) {
      const ehFinal = r === rodadas;
      lutas.push({
        id: idLuta(r, p),
        rodada: r,
        posicao: p,
        atleta1: r === 1 ? (primeiraRodada[p][0]?.id ?? null) : null,
        atleta2: r === 1 ? (primeiraRodada[p][1]?.id ?? null) : null,
        proximaLutaId: ehFinal ? null : idLuta(r + 1, Math.floor(p / 2)),
        proximaLutaSlot: ehFinal ? null : ((p % 2) + 1) as 1 | 2,
        vencedor: null,
        metodo: null,
        bye: false,
      });
    }
  }

  const chave: Chave = { formato: "eliminacao_simples", seed: opcoes.seed, rodadas, lutas };

  // byes avançam automaticamente
  for (const luta of chave.lutas.filter((l) => l.rodada === 1)) {
    const solitario =
      luta.atleta1 && !luta.atleta2
        ? luta.atleta1
        : !luta.atleta1 && luta.atleta2
          ? luta.atleta2
          : null;
    if (solitario) {
      luta.bye = true;
      luta.vencedor = solitario;
      avancarVencedor(chave, luta);
    }
  }

  return chave;
}

function encontrarLuta(chave: Chave, lutaId: string): Luta {
  const luta = chave.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  return luta;
}

function avancarVencedor(chave: Chave, luta: Luta): void {
  if (!luta.proximaLutaId || !luta.vencedor) return;
  const proxima = encontrarLuta(chave, luta.proximaLutaId);
  if (luta.proximaLutaSlot === 1) proxima.atleta1 = luta.vencedor;
  else proxima.atleta2 = luta.vencedor;
}

/**
 * Registra o resultado de uma luta e avança o vencedor. Retorna uma nova
 * chave (não muta a original).
 *
 * Correção de resultado é permitida apenas enquanto a luta seguinte ainda
 * não foi decidida — depois disso, corrija primeiro as lutas posteriores.
 */
export function registrarResultado(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const luta = encontrarLuta(nova, lutaId);

  if (luta.bye) {
    throw new Error("Luta decidida por bye não recebe resultado");
  }
  if (!luta.atleta1 || !luta.atleta2) {
    throw new Error("A luta ainda não tem os dois atletas definidos");
  }
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }

  if (luta.vencedor && luta.proximaLutaId) {
    const proxima = encontrarLuta(nova, luta.proximaLutaId);
    if (proxima.vencedor) {
      throw new Error(
        "Resultado não pode ser corrigido: a luta seguinte já foi decidida",
      );
    }
  }

  luta.vencedor = vencedorId;
  luta.metodo = metodo;
  avancarVencedor(nova, luta);

  return nova;
}

/**
 * Pódio a partir da chave: campeão, vice e dois terceiros (perdedores das
 * semifinais — padrão BJJ). Campos ficam nulos enquanto as lutas
 * correspondentes não forem decididas.
 */
export function calcularPodio(chave: Chave): Podio {
  const final = chave.lutas.find((l) => l.rodada === chave.rodadas)!;

  const perdedor = (l: Luta): string | null =>
    l.vencedor === null || l.bye
      ? null
      : l.vencedor === l.atleta1
        ? l.atleta2
        : l.atleta1;

  const semis = chave.lutas.filter((l) => l.rodada === chave.rodadas - 1);
  const terceiros = semis
    .map(perdedor)
    .filter((id): id is string => id !== null);

  return {
    primeiro: final.vencedor,
    segundo: perdedor(final),
    terceiros,
  };
}
