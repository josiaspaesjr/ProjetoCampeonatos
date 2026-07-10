import { criarRng, embaralhar } from "./rng";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

function idLuta(rodada: number, posicao: number): string {
  return `r${rodada}p${posicao}`;
}

/**
 * Distribui os inscritos nos nós da 1ª rodada com o mínimo de byes: emparelha
 * o máximo de atletas possível — todos, quando o total é par. Só o último nó
 * fica com um atleta solitário, e apenas quando o total é ímpar.
 *
 * A separação de academias usa bisseção recursiva: a cada nível o intervalo é
 * dividido em duas metades e cada academia é repartida o mais igualmente
 * possível entre elas; recursivamente, colegas de equipe caem em sub-chaves
 * distintas e só podem se cruzar o mais tarde possível (idealmente na final).
 * Grupos maiores são repartidos primeiro, enquanto ainda há espaço.
 *
 * Retorna ceil(n/2) pares (um por luta da 1ª rodada); quando há bye ele vem
 * por último, como [atleta, null].
 */
function distribuirPrimeiraRodada(
  inscritos: Inscrito[],
  separarAcademias: boolean,
  rng: () => number,
): Array<[Inscrito | null, Inscrito | null]> {
  const sorteados = embaralhar(inscritos, rng);
  const temBye = sorteados.length % 2 === 1;
  // o atleta ímpar (sem par) sai antes da distribuição e vai sozinho no
  // último nó — é o único bye possível na 1ª rodada
  const byeAtleta = temBye ? sorteados[sorteados.length - 1] : null;
  const aDistribuir = temBye ? sorteados.slice(0, -1) : sorteados;
  const total = aDistribuir.length; // sempre par

  const posicoes = new Array<Inscrito | null>(total).fill(null);

  // reparte os atletas em duas metades de tamanho exato (tamEsq / resto),
  // separando cada academia o mais igualmente possível. Alterna os lados a cada
  // atleta e, em grupos ímpares, alterna também qual lado começa — o que mantém
  // as academias espalhadas; a capacidade de cada lado é sempre respeitada.
  const repartir = (
    atletas: Inscrito[],
    tamEsq: number,
  ): [Inscrito[], Inscrito[]] => {
    if (!separarAcademias) {
      return [atletas.slice(0, tamEsq), atletas.slice(tamEsq)];
    }
    const grupos = new Map<string, Inscrito[]>();
    atletas.forEach((a, i) => {
      const grupo = a.academiaId ?? `__sem_academia_${i}`;
      grupos.set(grupo, [...(grupos.get(grupo) ?? []), a]);
    });
    const ordenados = [...grupos.values()].sort((a, b) => b.length - a.length);
    const esquerda: Inscrito[] = [];
    const direita: Inscrito[] = [];
    const tamDir = atletas.length - tamEsq;
    let comecaNaEsquerda = true;
    for (const grupo of ordenados) {
      let naEsquerda = comecaNaEsquerda;
      for (const atleta of grupo) {
        // vai pro lado da vez; se ele estiver cheio, transborda pro outro
        const vaiEsquerda = naEsquerda
          ? esquerda.length < tamEsq
          : direita.length >= tamDir;
        (vaiEsquerda ? esquerda : direita).push(atleta);
        naEsquerda = !naEsquerda;
      }
      if (grupo.length % 2 === 1) comecaNaEsquerda = !comecaNaEsquerda;
    }
    return [esquerda, direita];
  };

  // aloca os atletas nas posições [inicio, fim). Os cortes caem sempre em
  // fronteira de nó (índice par) até restar um único nó (2 slots), que aí sim é
  // partido em dois slots — separando os dois atletas da luta por academia.
  const alocar = (atletas: Inscrito[], inicio: number, fim: number): void => {
    if (atletas.length === 0) return;
    const nSlots = fim - inicio;
    if (nSlots === 1) {
      posicoes[inicio] = atletas[0];
      return;
    }
    const meio =
      nSlots === 2 ? inicio + 1 : inicio + Math.ceil(nSlots / 2 / 2) * 2;
    const [esq, dir] = repartir(atletas, meio - inicio);
    alocar(esq, inicio, meio);
    alocar(dir, meio, fim);
  };

  alocar(aDistribuir, 0, total);

  const pares: Array<[Inscrito | null, Inscrito | null]> = [];
  for (let p = 0; p < total / 2; p++) {
    pares.push([posicoes[2 * p] ?? null, posicoes[2 * p + 1] ?? null]);
  }
  if (byeAtleta) pares.push([byeAtleta, null]);
  return pares;
}

/**
 * Gera uma chave de eliminação simples com o mínimo de byes.
 *
 * Cada rodada emparelha o máximo de vencedores (todos, quando são em número
 * par); só quando a contagem fica ímpar um vencedor recebe bye para a rodada
 * seguinte. Assim, com total par, todos lutam na 1ª rodada, e os poucos byes
 * inevitáveis surgem em rodadas mais adiante. Os byes são espalhados por
 * atletas diferentes — ninguém recebe dois byes seguidos.
 *
 * Determinística: mesma seed + mesmos inscritos (mesma ordem) = mesma chave.
 * O bye da 1ª rodada avança automaticamente; os das rodadas seguintes avançam
 * quando o vencedor que os alimenta é definido.
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
  const n = inscritos.length;

  // nº de nós por rodada (folding): cada rodada tem ceil(entrando/2) nós; o
  // ceil preserva o vencedor ímpar (bye) para a rodada seguinte
  const nosPorRodada: number[] = [];
  for (let entrando = n; entrando > 1; entrando = Math.ceil(entrando / 2)) {
    nosPorRodada.push(Math.ceil(entrando / 2));
  }
  const rodadas = nosPorRodada.length;

  // vencedores que entram na rodada k (1-indexado); ímpar ⇒ há um bye nela
  const entradaRodada = (k: number): number =>
    k === 1 ? n : nosPorRodada[k - 2];
  const temByeNaRodada = (k: number): boolean => entradaRodada(k) % 2 === 1;

  const pares = distribuirPrimeiraRodada(inscritos, separarAcademias, rng);

  const criar = (rodada: number, posicao: number): Luta => ({
    id: idLuta(rodada, posicao),
    rodada,
    posicao,
    atleta1: null,
    atleta2: null,
    proximaLutaId: null,
    proximaLutaSlot: null,
    vencedor: null,
    metodo: null,
    bye: false,
  });

  const porRodada: Luta[][] = [
    pares.map((par, p) => {
      const luta = criar(1, p);
      luta.atleta1 = par[0]?.id ?? null;
      luta.atleta2 = par[1]?.id ?? null;
      return luta;
    }),
  ];

  for (let r = 2; r <= rodadas; r++) {
    const anterior = porRodada[r - 2];
    porRodada.push(Array.from({ length: nosPorRodada[r - 1] }, (_, q) => criar(r, q)));

    // ordem de entrada dos vencedores. Se a rodada anterior teve um bye, o
    // vencedor que "passou" (último nó) vem primeiro para ser emparelhado
    // agora — assim ele não recebe bye de novo e os byes ficam em atletas
    // diferentes.
    const entrada = [...anterior];
    if (temByeNaRodada(r - 1)) entrada.unshift(entrada.pop()!);
    entrada.forEach((luta, i) => {
      luta.proximaLutaId = idLuta(r, Math.floor(i / 2));
      luta.proximaLutaSlot = ((i % 2) + 1) as 1 | 2;
    });
  }

  // marca os nós de bye: último nó da rodada em que a contagem fica ímpar
  for (let k = 1; k <= rodadas; k++) {
    if (temByeNaRodada(k)) {
      const daRodada = porRodada[k - 1];
      daRodada[daRodada.length - 1].bye = true;
    }
  }

  const chave: Chave = {
    formato: "eliminacao_simples",
    seed: opcoes.seed,
    rodadas,
    lutas: porRodada.flat(),
  };

  // o bye da 1ª rodada já tem atleta → avança na hora
  const byeInicial = porRodada[0].find((l) => l.bye);
  const solitario = byeInicial?.atleta1 ?? byeInicial?.atleta2 ?? null;
  if (byeInicial && solitario) {
    byeInicial.vencedor = solitario;
    avancarVencedor(chave, byeInicial);
  }

  return chave;
}

function encontrarLuta(chave: Chave, lutaId: string): Luta {
  const luta = chave.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  return luta;
}

/**
 * Coloca o vencedor no slot da próxima luta. Se a próxima for um bye (sem
 * adversário), decide-a na hora e continua avançando — cobre byes de rodadas
 * mais adiante, resolvidos quando o vencedor que os alimenta é definido.
 */
function avancarVencedor(chave: Chave, luta: Luta): void {
  if (!luta.proximaLutaId || !luta.vencedor) return;
  const proxima = encontrarLuta(chave, luta.proximaLutaId);
  if (luta.proximaLutaSlot === 1) proxima.atleta1 = luta.vencedor;
  else proxima.atleta2 = luta.vencedor;
  if (proxima.bye) {
    proxima.vencedor = luta.vencedor;
    avancarVencedor(chave, proxima);
  }
}

/**
 * Registra o resultado de uma luta e avança o vencedor. Retorna uma nova
 * chave (não muta a original).
 *
 * Correção de resultado é permitida apenas enquanto a próxima luta real (byes
 * são pulados) ainda não foi decidida — depois disso, corrija primeiro as
 * lutas posteriores.
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
    let proxima = encontrarLuta(nova, luta.proximaLutaId);
    while (proxima.bye && proxima.proximaLutaId) {
      proxima = encontrarLuta(nova, proxima.proximaLutaId);
    }
    if (!proxima.bye && proxima.vencedor) {
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
 * semifinais — padrão BJJ). Semifinais decididas por bye não geram terceiro.
 * Campos ficam nulos enquanto as lutas correspondentes não forem decididas.
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
