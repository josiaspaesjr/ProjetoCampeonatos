import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { chaves, inscricoes, lutas } from "@/db/schema";
import {
  calcularPodio,
  gerarEliminacaoSimples,
  gerarRoundRobin,
  podioRoundRobin,
  registrarResultado,
  registrarResultadoRoundRobin,
} from "@/lib/bracket";
import type { Chave as ChaveEngine, MetodoVitoria, Podio } from "@/lib/bracket";

/**
 * Ponte entre o motor de chaveamento (puro, testado) e o banco.
 *
 * O motor trabalha com ids locais; aqui cada luta ganha um uuid antes da
 * inserção e o encadeamento (proximaLutaId) é remapeado. Para registrar
 * resultados, a chave é reconstruída do banco, o motor aplica a regra
 * (validações e avanço) e o diff volta para as linhas afetadas.
 */

export type FormatoChave = "eliminacao_simples" | "round_robin";

/**
 * Regra automática de formato por tamanho da divisão (padrão CBJJ):
 * até 3 atletas → todos contra todos; 4+ → eliminação simples.
 */
export function formatoAutomatico(qtdInscritos: number): FormatoChave {
  return qtdInscritos <= 3 ? "round_robin" : "eliminacao_simples";
}

export async function gerarChaveParaCategoria(
  db: Db,
  categoriaId: string,
  formato: FormatoChave | "auto" = "auto",
) {
  const confirmadas = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.categoriaId, categoriaId),
      eq(inscricoes.status, "confirmada"),
    ),
  });
  if (confirmadas.length < 2) {
    throw new Error("A categoria precisa de ao menos 2 inscrições confirmadas");
  }

  // regeneração permitida apenas em rascunho
  const existente = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  if (existente) {
    if (existente.status !== "rascunho") {
      throw new Error("Chave publicada não pode ser regenerada");
    }
    await db.delete(lutas).where(eq(lutas.chaveId, existente.id));
    await db.delete(chaves).where(eq(chaves.id, existente.id));
  }

  const formatoFinal =
    formato === "auto" ? formatoAutomatico(confirmadas.length) : formato;

  const seed = crypto.randomUUID();
  const participantes = confirmadas.map((i) => ({
    id: i.id,
    nome: i.nomeAtleta,
    academiaId: i.academiaId,
  }));
  const engine =
    formatoFinal === "round_robin"
      ? gerarRoundRobin(participantes, { seed })
      : gerarEliminacaoSimples(participantes, { seed });

  const [chave] = await db
    .insert(chaves)
    .values({ categoriaId, formato: formatoFinal, seedSorteio: seed })
    .returning();

  // uuid por luta antes do insert para remapear o encadeamento
  const uuidPorIdLocal = new Map(engine.lutas.map((l) => [l.id, crypto.randomUUID()]));
  await db.insert(lutas).values(
    engine.lutas.map((l) => ({
      id: uuidPorIdLocal.get(l.id)!,
      chaveId: chave.id,
      rodada: l.rodada,
      posicao: l.posicao,
      atleta1InscricaoId: l.atleta1,
      atleta2InscricaoId: l.atleta2,
      proximaLutaId: l.proximaLutaId ? uuidPorIdLocal.get(l.proximaLutaId)! : null,
      proximaLutaSlot: l.proximaLutaSlot,
      vencedorInscricaoId: l.vencedor, // byes já avançados pelo motor
      encerradaEm: l.bye ? new Date() : null,
    })),
  );

  return chave;
}

type LutaRow = typeof lutas.$inferSelect;
type ChaveRow = { seedSorteio: string; formato: string };

function ehBye(formato: FormatoChave, l: LutaRow): boolean {
  return (
    formato === "eliminacao_simples" &&
    l.rodada === 1 &&
    (l.atleta1InscricaoId === null) !== (l.atleta2InscricaoId === null)
  );
}

function formatoDaChave(chave: ChaveRow): FormatoChave {
  return chave.formato === "round_robin" ? "round_robin" : "eliminacao_simples";
}

export function montarChaveEngine(chave: ChaveRow, linhas: LutaRow[]): ChaveEngine {
  const formato = formatoDaChave(chave);
  return {
    formato,
    seed: chave.seedSorteio,
    rodadas: Math.max(...linhas.map((l) => l.rodada)),
    lutas: linhas.map((l) => ({
      id: l.id,
      rodada: l.rodada,
      posicao: l.posicao,
      atleta1: l.atleta1InscricaoId,
      atleta2: l.atleta2InscricaoId,
      proximaLutaId: l.proximaLutaId,
      proximaLutaSlot: (l.proximaLutaSlot ?? null) as 1 | 2 | null,
      vencedor: l.vencedorInscricaoId,
      metodo: l.metodo,
      bye: ehBye(formato, l),
    })),
  };
}

/** Pódio de uma chave concluída, respeitando o formato. */
export function calcularPodioDaChave(chave: ChaveRow, linhas: LutaRow[]): Podio {
  const engine = montarChaveEngine(chave, linhas);
  return engine.formato === "round_robin"
    ? podioRoundRobin(engine)
    : calcularPodio(engine);
}

export interface PlacarLuta {
  pontos1?: number;
  vantagens1?: number;
  punicoes1?: number;
  pontos2?: number;
  vantagens2?: number;
  punicoes2?: number;
  nomeFinalizacao?: string;
}

export async function registrarResultadoNoBanco(
  db: Db,
  chaveId: string,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
  placar: PlacarLuta = {},
) {
  const chave = await db.query.chaves.findFirst({ where: eq(chaves.id, chaveId) });
  if (!chave) throw new Error("Chave não encontrada");
  if (chave.status === "rascunho") {
    throw new Error("Publique a chave antes de lançar resultados");
  }

  const linhas = await db.query.lutas.findMany({ where: eq(lutas.chaveId, chaveId) });
  const antes = montarChaveEngine(chave, linhas);

  // o motor valida (vencedor pertence à luta, correção bloqueada etc.) e avança
  const depois =
    antes.formato === "round_robin"
      ? registrarResultadoRoundRobin(antes, lutaId, vencedorId, metodo)
      : registrarResultado(antes, lutaId, vencedorId, metodo);

  const lutaDecidida = depois.lutas.find((l) => l.id === lutaId)!;
  await db
    .update(lutas)
    .set({
      vencedorInscricaoId: lutaDecidida.vencedor,
      metodo: lutaDecidida.metodo,
      encerradaEm: new Date(),
      pontos1: placar.pontos1 ?? 0,
      vantagens1: placar.vantagens1 ?? 0,
      punicoes1: placar.punicoes1 ?? 0,
      pontos2: placar.pontos2 ?? 0,
      vantagens2: placar.vantagens2 ?? 0,
      punicoes2: placar.punicoes2 ?? 0,
      nomeFinalizacao: placar.nomeFinalizacao ?? null,
    })
    .where(eq(lutas.id, lutaId));

  if (lutaDecidida.proximaLutaId) {
    const proxima = depois.lutas.find((l) => l.id === lutaDecidida.proximaLutaId)!;
    await db
      .update(lutas)
      .set({
        atleta1InscricaoId: proxima.atleta1,
        atleta2InscricaoId: proxima.atleta2,
      })
      .where(eq(lutas.id, proxima.id));
  }

  const concluida =
    depois.formato === "round_robin"
      ? depois.lutas.every((l) => l.vencedor !== null)
      : depois.lutas.find((l) => l.rodada === depois.rodadas)!.vencedor !== null;
  const novoStatus = concluida ? "concluida" : "em_andamento";
  if (novoStatus !== chave.status) {
    await db.update(chaves).set({ status: novoStatus }).where(eq(chaves.id, chaveId));
  }

  const podio = concluida
    ? depois.formato === "round_robin"
      ? podioRoundRobin(depois)
      : calcularPodio(depois)
    : null;
  return { podio };
}
