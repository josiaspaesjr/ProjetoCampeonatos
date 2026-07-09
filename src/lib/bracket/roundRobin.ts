import { criarRng, embaralhar } from "./rng";
import type { Chave, Inscrito, Luta, MetodoVitoria, OpcoesGeracao, Podio } from "./types";

/**
 * Round robin (todos contra todos) — formato padrão CBJJ para divisões
 * pequenas (2–3 atletas; suportado para qualquer tamanho).
 *
 * Agenda pelo método do círculo: cada atleta luta no máximo uma vez por
 * rodada; com número ímpar de atletas, um descansa a cada rodada (sem linha
 * de bye — a luta simplesmente não existe). Determinística por seed.
 */
export function gerarRoundRobin(inscritos: Inscrito[], opcoes: OpcoesGeracao): Chave {
  if (inscritos.length < 2) {
    throw new Error("É preciso ao menos 2 inscritos para gerar uma chave");
  }
  const ids = new Set(inscritos.map((i) => i.id));
  if (ids.size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const sorteados = embaralhar(inscritos, rng).map((i) => i.id);

  // método do círculo: fantasma (null) completa o número par
  const roda: (string | null)[] = [...sorteados];
  if (roda.length % 2 === 1) roda.push(null);
  const n = roda.length;
  const rodadas = n - 1;

  const lutas: Luta[] = [];
  for (let r = 0; r < rodadas; r++) {
    let posicao = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = roda[i];
      const b = roda[n - 1 - i];
      if (a === null || b === null) continue; // descanso do ímpar
      lutas.push({
        id: `r${r + 1}p${posicao}`,
        rodada: r + 1,
        posicao,
        atleta1: a,
        atleta2: b,
        proximaLutaId: null,
        proximaLutaSlot: null,
        vencedor: null,
        metodo: null,
        bye: false,
      });
      posicao++;
    }
    // gira mantendo o primeiro fixo
    roda.splice(1, 0, roda.pop()!);
  }

  return { formato: "round_robin", seed: opcoes.seed, rodadas, lutas };
}

/**
 * Registra o resultado de uma luta do round robin. Sem avanço de vencedor —
 * correção é sempre permitida enquanto a classificação não for oficializada
 * fora do motor. Retorna nova chave (não muta a original).
 */
export function registrarResultadoRoundRobin(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const luta = nova.lutas.find((l) => l.id === lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }
  luta.vencedor = vencedorId;
  luta.metodo = metodo;
  return nova;
}

export interface LinhaClassificacao {
  atleta: string;
  vitorias: number;
  finalizacoes: number;
}

/**
 * Classificação do round robin: vitórias → confronto direto (empate entre
 * dois) → vitórias por finalização → ordem do sorteio (estável).
 */
export function classificacaoRoundRobin(chave: Chave): LinhaClassificacao[] {
  const atletas = [
    ...new Set(
      chave.lutas.flatMap((l) =>
        [l.atleta1, l.atleta2].filter((a): a is string => a !== null),
      ),
    ),
  ];

  const linhas = atletas.map((atleta) => ({
    atleta,
    vitorias: chave.lutas.filter((l) => l.vencedor === atleta).length,
    finalizacoes: chave.lutas.filter(
      (l) => l.vencedor === atleta && l.metodo === "finalizacao",
    ).length,
  }));

  return linhas.sort((a, b) => {
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    // confronto direto só desempata par a par
    const empatados = linhas.filter((l) => l.vitorias === a.vitorias);
    if (empatados.length === 2) {
      const direta = chave.lutas.find(
        (l) =>
          (l.atleta1 === a.atleta && l.atleta2 === b.atleta) ||
          (l.atleta1 === b.atleta && l.atleta2 === a.atleta),
      );
      if (direta?.vencedor === a.atleta) return -1;
      if (direta?.vencedor === b.atleta) return 1;
    }
    return b.finalizacoes - a.finalizacoes;
  });
}

/** Pódio do round robin — nulo enquanto houver luta sem resultado. */
export function podioRoundRobin(chave: Chave): Podio {
  const pendentes = chave.lutas.some((l) => l.vencedor === null);
  if (pendentes) return { primeiro: null, segundo: null, terceiros: [] };

  const classificacao = classificacaoRoundRobin(chave);
  return {
    primeiro: classificacao[0]?.atleta ?? null,
    segundo: classificacao[1]?.atleta ?? null,
    terceiros: classificacao[2] ? [classificacao[2].atleta] : [],
  };
}
