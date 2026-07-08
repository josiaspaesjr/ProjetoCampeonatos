import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { chaves, inscricoes, lutas } from "@/db/schema";
import {
  calcularPodio,
  gerarEliminacaoSimples,
  registrarResultado,
} from "@/lib/bracket";
import type { Chave as ChaveEngine, MetodoVitoria } from "@/lib/bracket";

/**
 * Ponte entre o motor de chaveamento (puro, testado) e o banco.
 *
 * O motor trabalha com ids locais; aqui cada luta ganha um uuid antes da
 * inserção e o encadeamento (proximaLutaId) é remapeado. Para registrar
 * resultados, a chave é reconstruída do banco, o motor aplica a regra
 * (validações e avanço) e o diff volta para as linhas afetadas.
 */

export async function gerarChaveParaCategoria(db: Db, categoriaId: string) {
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

  const seed = crypto.randomUUID();
  const engine = gerarEliminacaoSimples(
    confirmadas.map((i) => ({
      id: i.id,
      nome: i.nomeAtleta,
      academiaId: i.academiaId,
    })),
    { seed },
  );

  const [chave] = await db
    .insert(chaves)
    .values({ categoriaId, seedSorteio: seed })
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

function ehBye(l: LutaRow): boolean {
  return (
    l.rodada === 1 &&
    (l.atleta1InscricaoId === null) !== (l.atleta2InscricaoId === null)
  );
}

export function montarChaveEngine(
  chave: { seedSorteio: string },
  linhas: LutaRow[],
): ChaveEngine {
  return {
    formato: "eliminacao_simples",
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
      bye: ehBye(l),
    })),
  };
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
  const depois = registrarResultado(antes, lutaId, vencedorId, metodo);

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

  const final = depois.lutas.find((l) => l.rodada === depois.rodadas)!;
  const novoStatus = final.vencedor ? "concluida" : "em_andamento";
  if (novoStatus !== chave.status) {
    await db.update(chaves).set({ status: novoStatus }).where(eq(chaves.id, chaveId));
  }

  return { podio: final.vencedor ? calcularPodio(depois) : null };
}
