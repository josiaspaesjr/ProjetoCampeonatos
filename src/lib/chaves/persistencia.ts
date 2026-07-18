import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { chaves, inscricoes, lutas } from "@/db/schema";
import {
  calcularPodio,
  eliminacaoDuplaConcluida,
  formatoAutomatico,
  gerarEliminacaoDupla,
  gerarEliminacaoSimples,
  gerarMelhorDeTres,
  gerarRoundRobin,
  gerarTresRepescagem,
  colocacaoConcluida,
  gerarColocacao,
  podioColocacao,
  podioEliminacaoDupla,
  podioMelhorDeTres,
  podioRoundRobin,
  podioTresRepescagem,
  registrarResultado,
  registrarResultadoColocacao,
  registrarResultadoEliminacaoDupla,
  registrarResultadoMelhorDeTres,
  registrarResultadoRoundRobin,
  registrarResultadoTresRepescagem,
  serieDecidida,
  tresRepescagemConcluida,
} from "@/lib/bracket";
import type {
  Chave as ChaveEngine,
  FormatoChaveId,
  FormatoSelecionavel,
  MetodoVitoria,
  Podio,
} from "@/lib/bracket";
import { idsDeBye } from "@/lib/chaves/byes";

/**
 * Ponte entre o motor de chaveamento (puro, testado) e o banco.
 *
 * O motor trabalha com ids locais; aqui cada luta ganha um uuid antes da
 * inserção e o encadeamento (proximaLutaId) é remapeado. Para registrar
 * resultados, a chave é reconstruída do banco, o motor aplica a regra
 * (validações e avanço) e o diff volta para as linhas afetadas.
 */

/** Alias local do id de formato; regras/metadados vivem em @/lib/bracket/formatos. */
export type FormatoChave = FormatoChaveId;

export async function gerarChaveParaCategoria(
  db: Db,
  categoriaId: string,
  formato: FormatoSelecionavel = "auto",
) {
  const confirmadas = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.categoriaId, categoriaId),
      eq(inscricoes.status, "confirmada"),
    ),
  });
  // mensagens de erro usam códigos neutros de idioma — a UI traduz via
  // dic.admin.erros.chave[código] (ver src/app/organizador/eventos/actions.ts)
  if (confirmadas.length < 2) {
    throw new Error("chave_min_inscricoes");
  }

  // regeneração permitida apenas em rascunho
  const existente = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  if (existente) {
    if (existente.status !== "rascunho") {
      throw new Error("chave_publicada");
    }
    await db.delete(lutas).where(eq(lutas.chaveId, existente.id));
    await db.delete(chaves).where(eq(chaves.id, existente.id));
  }

  const formatoFinal: FormatoChaveId =
    formato === "auto" ? formatoAutomatico(confirmadas.length) : formato;

  const seed = crypto.randomUUID();
  const participantes = confirmadas.map((i) => ({
    id: i.id,
    nome: i.nomeAtleta,
    academiaId: i.academiaId,
  }));
  // dispatch por formato — cada fase liga o motor do seu formato aqui.
  // formatos ainda sem motor caem no erro neutro (a UI só oferece os prontos).
  let engine: ChaveEngine;
  switch (formatoFinal) {
    case "round_robin":
      engine = gerarRoundRobin(participantes, { seed });
      break;
    case "eliminacao_simples":
      engine = gerarEliminacaoSimples(participantes, { seed });
      break;
    case "melhor_de_tres":
      if (participantes.length !== 2) throw new Error("chave_formato_exige_2");
      engine = gerarMelhorDeTres(participantes, { seed });
      break;
    case "tres_repescagem":
      if (participantes.length !== 3) throw new Error("chave_formato_exige_3");
      engine = gerarTresRepescagem(participantes, { seed });
      break;
    case "eliminacao_dupla":
      engine = gerarEliminacaoDupla(participantes, { seed });
      break;
    case "colocacao":
      engine = gerarColocacao(participantes, { seed });
      break;
    default:
      throw new Error("formato_nao_implementado");
  }

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
      proximaLutaPerdedorId: l.proximaLutaPerdedorId
        ? uuidPorIdLocal.get(l.proximaLutaPerdedorId)!
        : null,
      proximaLutaPerdedorSlot: l.proximaLutaPerdedorSlot ?? null,
      fase: l.fase ?? null,
      vencedorInscricaoId: l.vencedor, // bye da 1ª rodada já avançado pelo motor
      // byes de rodadas seguintes ainda não têm vencedor: encerram só ao avançar
      encerradaEm: l.vencedor ? new Date() : null,
    })),
  );

  return chave;
}

type LutaRow = typeof lutas.$inferSelect;
type ChaveRow = { seedSorteio: string; formato: string };

function formatoDaChave(chave: ChaveRow): FormatoChaveId {
  return chave.formato as FormatoChaveId;
}

/** Aplica o resultado no motor do formato (validações e avanço próprios dele). */
function registrarNoEngine(
  chave: ChaveEngine,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): ChaveEngine {
  switch (chave.formato) {
    case "round_robin":
      return registrarResultadoRoundRobin(chave, lutaId, vencedorId, metodo);
    case "melhor_de_tres":
      return registrarResultadoMelhorDeTres(chave, lutaId, vencedorId, metodo);
    case "tres_repescagem":
      return registrarResultadoTresRepescagem(chave, lutaId, vencedorId, metodo);
    case "eliminacao_dupla":
      return registrarResultadoEliminacaoDupla(chave, lutaId, vencedorId, metodo);
    case "colocacao":
      return registrarResultadoColocacao(chave, lutaId, vencedorId, metodo);
    default:
      return registrarResultado(chave, lutaId, vencedorId, metodo);
  }
}

/** Pódio segundo a regra do formato. */
function podioDoEngine(chave: ChaveEngine): Podio {
  switch (chave.formato) {
    case "round_robin":
      return podioRoundRobin(chave);
    case "melhor_de_tres":
      return podioMelhorDeTres(chave);
    case "tres_repescagem":
      return podioTresRepescagem(chave);
    case "eliminacao_dupla":
      return podioEliminacaoDupla(chave);
    case "colocacao":
      return podioColocacao(chave);
    default:
      return calcularPodio(chave);
  }
}

/** Chave concluída segundo a regra do formato. */
function chaveConcluida(chave: ChaveEngine): boolean {
  switch (chave.formato) {
    case "round_robin":
      return chave.lutas.every((l) => l.vencedor !== null);
    case "melhor_de_tres":
      return serieDecidida(chave);
    case "tres_repescagem":
      return tresRepescagemConcluida(chave);
    case "eliminacao_dupla":
      return eliminacaoDuplaConcluida(chave);
    case "colocacao":
      return colocacaoConcluida(chave);
    default: {
      // eliminação: final (última rodada) decidida
      const final = chave.lutas.find((l) => l.rodada === chave.rodadas);
      return !!final && final.vencedor !== null;
    }
  }
}

export function montarChaveEngine(chave: ChaveRow, linhas: LutaRow[]): ChaveEngine {
  const formato = formatoDaChave(chave);
  // na dupla o bye é "vencedor definido com apenas um atleta" (walkover); nos
  // demais em árvore, a detecção geométrica de idsDeBye.
  const byes =
    formato === "eliminacao_dupla" || formato === "colocacao"
      ? new Set(
          linhas
            .filter(
              (l) =>
                l.vencedorInscricaoId != null &&
                (l.atleta1InscricaoId == null) !== (l.atleta2InscricaoId == null),
            )
            .map((l) => l.id),
        )
      : idsDeBye(linhas, formato);
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
      proximaLutaPerdedorId: l.proximaLutaPerdedorId,
      proximaLutaPerdedorSlot: (l.proximaLutaPerdedorSlot ?? null) as 1 | 2 | null,
      fase: l.fase,
      vencedor: l.vencedorInscricaoId,
      metodo: l.metodo,
      bye: byes.has(l.id),
    })),
  };
}

/** Pódio de uma chave concluída, respeitando o formato. */
export function calcularPodioDaChave(chave: ChaveRow, linhas: LutaRow[]): Podio {
  return podioDoEngine(montarChaveEngine(chave, linhas));
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
  const depois = registrarNoEngine(antes, lutaId, vencedorId, metodo);

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

  // propaga o avanço a todas as lutas que mudaram — inclui a cascata através de
  // byes de rodadas seguintes (o bye avança sozinho e alimenta a luta adiante)
  for (const d of depois.lutas) {
    if (d.id === lutaId) continue;
    const a = antes.lutas.find((l) => l.id === d.id)!;
    if (
      a.atleta1 === d.atleta1 &&
      a.atleta2 === d.atleta2 &&
      a.vencedor === d.vencedor
    ) {
      continue;
    }
    await db
      .update(lutas)
      .set({
        atleta1InscricaoId: d.atleta1,
        atleta2InscricaoId: d.atleta2,
        vencedorInscricaoId: d.vencedor,
        metodo: d.metodo,
        encerradaEm: d.vencedor ? new Date() : null,
      })
      .where(eq(lutas.id, d.id));
  }

  const concluida = chaveConcluida(depois);
  const novoStatus = concluida ? "concluida" : "em_andamento";
  if (novoStatus !== chave.status) {
    await db.update(chaves).set({ status: novoStatus }).where(eq(chaves.id, chaveId));
  }

  const podio = concluida ? podioDoEngine(depois) : null;
  return { podio };
}
