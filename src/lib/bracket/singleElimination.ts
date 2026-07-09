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
 * Distribui os inscritos nas posições da chave maximizando a distância entre
 * atletas da mesma academia — bisseção recursiva.
 *
 * A chave é uma árvore binária: duas posições só se cruzam na rodada do seu
 * ancestral comum. A cada nível a chave é dividida em duas metades e cada
 * academia é repartida o mais igualmente possível entre elas; recursivamente,
 * colegas de equipe caem em sub-chaves distintas e só podem se encontrar o
 * mais tarde possível (idealmente na final). Grupos maiores são repartidos
 * primeiro, enquanto ainda há espaço para separá-los.
 *
 * Byes são posições vazias. Como as metades ficam sempre equilibradas
 * (diferença de no máximo 1 atleta), os byes se espalham uniformemente — no
 * máximo um por luta.
 */
function distribuirPrimeiraRodada(
  inscritos: Inscrito[],
  totalLutas: number,
  separarAcademias: boolean,
  rng: () => number,
): Array<[Inscrito | null, Inscrito | null]> {
  const tamanho = totalLutas * 2;
  const posicoes = new Array<Inscrito | null>(tamanho).fill(null);
  const sorteados = embaralhar(inscritos, rng);

  // Reparte os atletas em duas metades separando cada academia o mais
  // igualmente possível. Cada grupo é distribuído alternando os lados; grupos
  // de tamanho ímpar alternam também o lado que recebe o atleta extra, o que
  // mantém as metades equilibradas (|esquerda| - |direita| ≤ 1).
  const repartir = (atletas: Inscrito[]): [Inscrito[], Inscrito[]] => {
    if (!separarAcademias) {
      const meio = Math.ceil(atletas.length / 2);
      return [atletas.slice(0, meio), atletas.slice(meio)];
    }
    const grupos = new Map<string, Inscrito[]>();
    atletas.forEach((a, i) => {
      const grupo = a.academiaId ?? `__sem_academia_${i}`;
      grupos.set(grupo, [...(grupos.get(grupo) ?? []), a]);
    });
    // grupos maiores primeiro, enquanto ainda há espaço para separá-los
    const ordenados = [...grupos.values()].sort((a, b) => b.length - a.length);
    const esquerda: Inscrito[] = [];
    const direita: Inscrito[] = [];
    let comecaNaEsquerda = true;
    for (const grupo of ordenados) {
      let naEsquerda = comecaNaEsquerda;
      for (const atleta of grupo) {
        (naEsquerda ? esquerda : direita).push(atleta);
        naEsquerda = !naEsquerda;
      }
      if (grupo.length % 2 === 1) comecaNaEsquerda = !comecaNaEsquerda;
    }
    return [esquerda, direita];
  };

  // Aloca os atletas nas posições [inicio, fim) descendo a árvore da chave.
  const alocar = (atletas: Inscrito[], inicio: number, fim: number): void => {
    if (atletas.length === 0) return;
    if (fim - inicio === 1) {
      posicoes[inicio] = atletas[0];
      return;
    }
    const meio = (inicio + fim) / 2;
    const [esquerda, direita] = repartir(atletas);
    alocar(esquerda, inicio, meio);
    alocar(direita, meio, fim);
  };

  alocar(sorteados, 0, tamanho);

  return Array.from({ length: totalLutas }, (_, p) => [
    posicoes[2 * p] ?? null,
    posicoes[2 * p + 1] ?? null,
  ]);
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

  const primeiraRodada = distribuirPrimeiraRodada(
    inscritos,
    tamanho / 2,
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
