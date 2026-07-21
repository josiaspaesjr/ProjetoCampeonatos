import { PGlite } from "@electric-sql/pglite";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { gerarChaveParaCategoria } from "@/lib/chaves/persistencia";
import { montarCronogramaDoEvento, type AreaCron } from "./cronograma-areas";
import { montarFilaDaArea } from "./fila";

/**
 * Ordem manual das lutas (drag-and-drop). `ordemCronograma` reordena a exibição
 * e a fila SEM tocar na topologia da chave. Cobre: baseline (sem override =
 * intercalação por descanso entre categorias), intercalação livre entre divisões
 * (corridas contíguas + rótulo "L{n}" estável) e a fila do telão seguindo o
 * override.
 */

let db: Db;
let eventoId: string;
let areaId: string;
let seq = 0;

// A = 4 atletas (3 lutas: a0,a1 na 1ª rodada, a2 na final) · faixa preta
// B = 2 atletas (1 luta: b0) · faixa azul
let A: { chaveId: string; lutas: (typeof schema.lutas.$inferSelect)[] };
let B: { chaveId: string; lutas: (typeof schema.lutas.$inferSelect)[] };

const AGORA = new Date("2026-05-10T09:00:00.000Z");

async function criarCategoria(
  nAtletas: number,
  faixa: "preta" | "azul",
  ordemNaArea: number,
) {
  const [cat] = await db
    .insert(schema.categorias)
    .values({
      eventoId,
      nome: `Cat ${++seq}`,
      sexo: "masculino",
      faixa,
      classeIdade: "adulto",
      areaId,
      ordemNaArea,
    })
    .returning();
  for (let i = 0; i < nAtletas; i++) {
    const marca = `atleta-${seq}-${i}`;
    const [u] = await db
      .insert(schema.usuarios)
      .values({ nome: marca, email: `${marca}@t.dev` })
      .returning();
    await db.insert(schema.inscricoes).values({
      usuarioId: u.id,
      eventoId,
      categoriaId: cat.id,
      status: "confirmada",
      nomeAtleta: marca,
      faixa,
      dataNascimento: "1996-01-01",
    });
  }
  const chave = await gerarChaveParaCategoria(db, cat.id);
  // publica para a fila do telão considerar (rascunho/concluida são ignoradas)
  await db
    .update(schema.chaves)
    .set({ status: "publicada" })
    .where(eq(schema.chaves.id, chave.id));
  const lutas = await db.query.lutas.findMany({
    where: eq(schema.lutas.chaveId, chave.id),
    orderBy: [asc(schema.lutas.rodada), asc(schema.lutas.posicao)],
  });
  return { chaveId: chave.id, lutas };
}

/** grava (ou zera) o override de ordem das lutas informadas */
async function definirOrdem(pares: [string, number | null][]) {
  for (const [id, n] of pares)
    await db.update(schema.lutas).set({ ordemCronograma: n }).where(eq(schema.lutas.id, id));
}

/** ids das lutas na ordem em que aparecem na coluna (achata os blocos) */
function idsNaColuna(area: AreaCron): string[] {
  return area.categorias.flatMap((c) => c.lutas.map((l) => l.id));
}

async function areaDoEvento(): Promise<AreaCron> {
  const cron = await montarCronogramaDoEvento(db, eventoId, "2026-05-10", AGORA);
  const area = cron.find((a) => a.id === areaId);
  if (!area) throw new Error("área não encontrada");
  return area;
}

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [org] = await db
    .insert(schema.usuarios)
    .values({ nome: "Org", email: "org-cron@t.dev", ehOrganizador: true })
    .returning();
  const [ev] = await db
    .insert(schema.eventos)
    .values({
      organizadorId: org.id,
      nome: "Copa Cron",
      slug: "copa-cron",
      dataInicio: "2026-05-10",
      status: "publicado",
    })
    .returning();
  eventoId = ev.id;
  const [ar] = await db
    .insert(schema.areas)
    .values({ eventoId, nome: "Área 01", ordem: 0 })
    .returning();
  areaId = ar.id;

  A = await criarCategoria(4, "preta", 0);
  B = await criarCategoria(2, "azul", 1);
  expect(A.lutas).toHaveLength(3);
  expect(B.lutas).toHaveLength(1);
});

describe("montarCronogramaDoEvento — ordem manual", () => {
  it("sem override: intercala as categorias para dar descanso", async () => {
    await definirOrdem([
      [A.lutas[0].id, null],
      [A.lutas[1].id, null],
      [A.lutas[2].id, null],
      [B.lutas[0].id, null],
    ]);
    const area = await areaDoEvento();

    // A tem 2 camadas (1ª rodada: a0, a1 · final: a2), B tem 1 (b0). Intercalando
    // por camada, b0 entra ANTES da final de A → o vencedor de a1 descansa em vez
    // de emendar a final. A quebra em 2 corridas (r1 e final), B no meio.
    expect(idsNaColuna(area)).toEqual([
      A.lutas[0].id,
      A.lutas[1].id,
      B.lutas[0].id,
      A.lutas[2].id,
    ]);
    expect(area.categorias.map((c) => c.faixa)).toEqual(["preta", "azul", "preta"]);
    // rótulo = índice na PRÓPRIA categoria: a final de A continua "L3"
    expect(area.categorias[2].lutas.map((l) => l.label)).toEqual(["L3"]);
  });

  it("intercala divisões: corridas contíguas + rótulo L{n} estável", async () => {
    // ordem desejada: A0, B0, A1, A2 (B entra no meio da divisão A)
    await definirOrdem([
      [A.lutas[0].id, 0],
      [B.lutas[0].id, 1],
      [A.lutas[1].id, 2],
      [A.lutas[2].id, 3],
    ]);
    const area = await areaDoEvento();

    // ordem plana segue o override
    expect(idsNaColuna(area)).toEqual([
      A.lutas[0].id,
      B.lutas[0].id,
      A.lutas[1].id,
      A.lutas[2].id,
    ]);
    // A quebra em 2 corridas (aparece 2x), B no meio
    expect(area.categorias).toHaveLength(3);
    expect(area.categorias.map((c) => c.faixa)).toEqual(["preta", "azul", "preta"]);
    // rótulo = índice na PRÓPRIA categoria (não na corrida): a1→L2, a2→L3
    expect(area.categorias[0].lutas.map((l) => l.label)).toEqual(["L1"]);
    expect(area.categorias[2].lutas.map((l) => l.label)).toEqual(["L2", "L3"]);
  });

  it("preserva a topologia: rodada/posição das lutas não mudam", async () => {
    const linhas = await db.query.lutas.findMany({
      where: eq(schema.lutas.chaveId, A.chaveId),
      orderBy: [asc(schema.lutas.rodada), asc(schema.lutas.posicao)],
    });
    expect(linhas.map((l) => l.id)).toEqual([
      A.lutas[0].id,
      A.lutas[1].id,
      A.lutas[2].id,
    ]);
  });
});

describe("montarFilaDaArea — ordem manual", () => {
  it("a fila do telão segue o override (vence o flatten por categoria)", async () => {
    await definirOrdem([
      [A.lutas[0].id, 0],
      [B.lutas[0].id, 1],
      [A.lutas[1].id, 2],
      [A.lutas[2].id, 3],
    ]);
    const fila = await montarFilaDaArea(db, areaId, AGORA);
    expect(fila?.fila.map((f) => f.luta.id)).toEqual([
      A.lutas[0].id,
      B.lutas[0].id,
      A.lutas[1].id,
      A.lutas[2].id,
    ]);
  });
});
