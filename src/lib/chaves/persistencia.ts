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
  gerarMultistage,
  multistageConcluida,
  podioColocacao,
  podioMultistage,
  registrarResultadoMultistage,
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
  gerarVotacao,
  podioVotacao,
  votacaoConcluida,
  type Apresentacao,
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
  opcoesFormato: { numJurados?: number } = {},
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
    case "multistage":
      engine = gerarMultistage(participantes, { seed });
      break;
    case "votacao_jurados":
      engine = gerarVotacao(participantes, { seed });
      break;
    default:
      throw new Error("formato_nao_implementado");
  }

  const config =
    formatoFinal === "votacao_jurados"
      ? { numJurados: Math.max(1, Math.min(9, Math.round(opcoesFormato.numJurados ?? 3))) }
      : null;
  const [chave] = await db
    .insert(chaves)
    .values({ categoriaId, formato: formatoFinal, seedSorteio: seed, config })
    .returning();

  await inserirLutas(db, chave.id, engine.lutas);
  return chave;
}

/**
 * Insere lutas do motor no banco, dando uuid a cada uma e remapeando o
 * encadeamento (proximaLuta/proximaLutaPerdedor) dentro do lote. Usado tanto na
 * geração quanto ao criar o playoff do multistage no meio do fluxo.
 */
async function inserirLutas(
  db: Db,
  chaveId: string,
  engineLutas: ChaveEngine["lutas"],
) {
  const uuidPorIdLocal = new Map(
    engineLutas.map((l) => [l.id, crypto.randomUUID()]),
  );
  const remap = (id: string | null | undefined) =>
    id ? (uuidPorIdLocal.get(id) ?? null) : null;
  await db.insert(lutas).values(
    engineLutas.map((l) => ({
      id: uuidPorIdLocal.get(l.id)!,
      chaveId,
      rodada: l.rodada,
      posicao: l.posicao,
      atleta1InscricaoId: l.atleta1,
      atleta2InscricaoId: l.atleta2,
      proximaLutaId: remap(l.proximaLutaId),
      proximaLutaSlot: l.proximaLutaSlot,
      proximaLutaPerdedorId: remap(l.proximaLutaPerdedorId),
      proximaLutaPerdedorSlot: l.proximaLutaPerdedorSlot ?? null,
      fase: l.fase ?? null,
      vencedorInscricaoId: l.vencedor, // bye da 1ª rodada já avançado pelo motor
      // byes de rodadas seguintes ainda não têm vencedor: encerram só ao avançar
      encerradaEm: l.vencedor ? new Date() : null,
    })),
  );
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
    case "multistage":
      return registrarResultadoMultistage(chave, lutaId, vencedorId, metodo);
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
    case "multistage":
      return podioMultistage(chave);
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
    case "multistage":
      return multistageConcluida(chave);
    default: {
      // eliminação: final (última rodada) decidida
      const final = chave.lutas.find((l) => l.rodada === chave.rodadas);
      return !!final && final.vencedor !== null;
    }
  }
}

export function montarChaveEngine(chave: ChaveRow, linhas: LutaRow[]): ChaveEngine {
  const formato = formatoDaChave(chave);
  // na dupla/colocação o bye é "vencedor definido com apenas um atleta"
  // (walkover); no multistage só o playoff tem bye (elim. simples); nos demais
  // em árvore, a detecção geométrica de idsDeBye.
  let byes: Set<string>;
  if (formato === "eliminacao_dupla" || formato === "colocacao") {
    byes = new Set(
      linhas
        .filter(
          (l) =>
            l.vencedorInscricaoId != null &&
            (l.atleta1InscricaoId == null) !== (l.atleta2InscricaoId == null),
        )
        .map((l) => l.id),
    );
  } else if (formato === "multistage") {
    byes = idsDeBye(
      linhas.filter((l) => l.fase === "playoff"),
      "eliminacao_simples",
    );
  } else {
    byes = idsDeBye(linhas, formato);
  }
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

/** Apresentações (votação por jurados) a partir das linhas de luta. */
function apresentacoesDe(linhas: LutaRow[]): Apresentacao[] {
  return linhas
    .filter((l) => l.fase === "apresentacao")
    .map((l) => ({ atleta: l.atleta1InscricaoId, notas: l.notas }));
}

/** Pódio de uma chave concluída, respeitando o formato. */
export function calcularPodioDaChave(chave: ChaveRow, linhas: LutaRow[]): Podio {
  if (chave.formato === "votacao_jurados") {
    return podioVotacao(apresentacoesDe(linhas));
  }
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
  const idsAntes = new Set(antes.lutas.map((l) => l.id));
  for (const d of depois.lutas) {
    if (d.id === lutaId) continue;
    if (!idsAntes.has(d.id)) continue; // luta nova (playoff do multistage) — inserida abaixo
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

  // lutas criadas agora (playoff do multistage, gerado ao encerrar os grupos)
  const novasLutas = depois.lutas.filter((d) => !idsAntes.has(d.id));
  if (novasLutas.length) await inserirLutas(db, chaveId, novasLutas);

  const concluida = chaveConcluida(depois);
  const novoStatus = concluida ? "concluida" : "em_andamento";
  if (novoStatus !== chave.status) {
    await db.update(chaves).set({ status: novoStatus }).where(eq(chaves.id, chaveId));
  }

  const podio = concluida ? podioDoEngine(depois) : null;
  return { podio };
}

/**
 * Salva as notas dos jurados de uma apresentação (votação por jurados). Sanea
 * para a escala 0–10 (1 decimal) e recomputa o status: concluída quando todos
 * os atletas têm as notas de todos os jurados.
 */
export async function salvarNotasVotacao(
  db: Db,
  chaveId: string,
  lutaId: string,
  notas: number[],
) {
  const chave = await db.query.chaves.findFirst({ where: eq(chaves.id, chaveId) });
  if (!chave) throw new Error("Chave não encontrada");
  if (chave.status === "rascunho") {
    throw new Error("Publique a chave antes de lançar notas");
  }
  const numJurados = chave.config?.numJurados ?? notas.length;
  const limpas = notas
    .slice(0, numJurados)
    .map((n) => Math.max(0, Math.min(10, Math.round((Number(n) || 0) * 10) / 10)));

  await db
    .update(lutas)
    .set({
      notas: limpas,
      encerradaEm: limpas.length >= numJurados ? new Date() : null,
    })
    .where(eq(lutas.id, lutaId));

  const linhas = await db.query.lutas.findMany({ where: eq(lutas.chaveId, chaveId) });
  const apres = apresentacoesDe(linhas);
  const concluida = votacaoConcluida(apres, numJurados);
  const novoStatus = concluida ? "concluida" : "em_andamento";
  if (novoStatus !== chave.status) {
    await db.update(chaves).set({ status: novoStatus }).where(eq(chaves.id, chaveId));
  }
  return { podio: concluida ? podioVotacao(apres) : null };
}
