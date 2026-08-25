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
 * Levar lutas e categorias de um tatame para outro. `lutas.areaId` diz onde a
 * luta CORRE (vence a área da categoria) e `categorias.areaId` move a divisão
 * inteira — nos dois casos a chave (rodada/posição) fica intacta, e tanto a
 * coluna do cronograma quanto a fila do telão/placar seguem a área efetiva.
 */

let db: Db;
let eventoId: string;
let area1: string;
let area2: string;
let seq = 0;

// A = 4 atletas (3 lutas) na Área 01 · B = 2 atletas (1 luta) na Área 01
let A: { catId: string; lutas: (typeof schema.lutas.$inferSelect)[] };
let B: { catId: string; lutas: (typeof schema.lutas.$inferSelect)[] };

const AGORA = new Date("2026-05-10T09:00:00.000Z");

async function criarCategoria(
  nAtletas: number,
  faixa: "preta" | "azul",
  areaId: string,
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
    const marca = `mover-${seq}-${i}`;
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
  await db
    .update(schema.chaves)
    .set({ status: "publicada" })
    .where(eq(schema.chaves.id, chave.id));
  const lutas = await db.query.lutas.findMany({
    where: eq(schema.lutas.chaveId, chave.id),
    orderBy: [asc(schema.lutas.rodada), asc(schema.lutas.posicao)],
  });
  return { catId: cat.id, lutas };
}

/** ids das lutas na ordem em que aparecem na coluna (achata os blocos) */
const idsNaColuna = (area: AreaCron) =>
  area.categorias.flatMap((c) => c.lutas.map((l) => l.id));

async function colunas() {
  const cron = await montarCronogramaDoEvento(db, eventoId, "2026-05-10", AGORA);
  const c1 = cron.find((a) => a.id === area1);
  const c2 = cron.find((a) => a.id === area2);
  if (!c1 || !c2) throw new Error("áreas não encontradas");
  return { c1, c2 };
}

/** ids na fila (telão/placar) de uma área */
async function fila(areaId: string) {
  const f = await montarFilaDaArea(db, areaId, AGORA);
  return (f?.fila ?? []).map((i) => i.luta.id);
}

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [org] = await db
    .insert(schema.usuarios)
    .values({ nome: "Org", email: "org-mover@t.dev", ehOrganizador: true })
    .returning();
  const [ev] = await db
    .insert(schema.eventos)
    .values({
      organizadorId: org.id,
      nome: "Copa Mover",
      slug: "copa-mover",
      dataInicio: "2026-05-10",
      status: "publicado",
    })
    .returning();
  eventoId = ev.id;
  const areasCriadas = await db
    .insert(schema.areas)
    .values([
      { eventoId, nome: "Área 01", ordem: 0 },
      { eventoId, nome: "Área 02", ordem: 1 },
    ])
    .returning();
  area1 = areasCriadas[0].id;
  area2 = areasCriadas[1].id;

  A = await criarCategoria(4, "preta", area1, 0);
  B = await criarCategoria(2, "azul", area1, 1);
  expect(A.lutas).toHaveLength(3);
  expect(B.lutas).toHaveLength(1);
});

describe("levar UMA luta para outro tatame", () => {
  it("a luta sai da coluna de origem e aparece na de destino", async () => {
    const antes = await colunas();
    expect(idsNaColuna(antes.c1)).toHaveLength(4);
    expect(idsNaColuna(antes.c2)).toHaveLength(0);

    // primeira luta de A vai para a Área 02
    await db
      .update(schema.lutas)
      .set({ areaId: area2 })
      .where(eq(schema.lutas.id, A.lutas[0].id));

    const depois = await colunas();
    expect(idsNaColuna(depois.c1)).not.toContain(A.lutas[0].id);
    expect(idsNaColuna(depois.c2)).toEqual([A.lutas[0].id]);
    // a categoria continua morando na Área 01 (só a luta viajou)
    const cat = await db.query.categorias.findFirst({
      where: eq(schema.categorias.id, A.catId),
    });
    expect(cat?.areaId).toBe(area1);
  });

  it("o rótulo L{n} continua o da categoria, não renumera no destino", async () => {
    const { c2 } = await colunas();
    const bloco = c2.categorias.find((c) => c.categoriaId === A.catId);
    expect(bloco?.lutas.map((l) => l.label)).toEqual(["L1"]);
  });

  it("a fila do telão/placar segue a área efetiva", async () => {
    const f1 = await fila(area1);
    const f2 = await fila(area2);
    expect(f1).not.toContain(A.lutas[0].id);
    expect(f2).toEqual([A.lutas[0].id]);
  });

  it("voltar a luta (areaId nulo) devolve à área da categoria", async () => {
    await db
      .update(schema.lutas)
      .set({ areaId: null })
      .where(eq(schema.lutas.id, A.lutas[0].id));

    const { c1, c2 } = await colunas();
    expect(idsNaColuna(c1)).toContain(A.lutas[0].id);
    expect(idsNaColuna(c2)).toHaveLength(0);
  });
});

describe("levar a CATEGORIA inteira para outro tatame", () => {
  it("todas as lutas da divisão mudam de coluna", async () => {
    await db
      .update(schema.categorias)
      .set({ areaId: area2, ordemNaArea: 1 })
      .where(eq(schema.categorias.id, B.catId));

    const { c1, c2 } = await colunas();
    expect(idsNaColuna(c1)).not.toContain(B.lutas[0].id);
    expect(idsNaColuna(c2)).toEqual([B.lutas[0].id]);
    expect(await fila(area2)).toEqual([B.lutas[0].id]);
    // A segue inteira na Área 01
    expect(idsNaColuna(c1)).toEqual(A.lutas.map((l) => l.id));
  });
});
