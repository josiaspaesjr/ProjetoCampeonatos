import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { motivoNaoPublicavel, publicarEventoCore } from "./publicacao";

/**
 * Publicar abre as inscrições e exige só o mínimo: 1 categoria + 1 lote.
 * NÃO pode exigir atletas inscritos, lutas, chaves nem áreas — um evento
 * recém-montado publica vazio.
 */

let db: Db;
let orgId: string;
let seq = 0;

/** Cria um evento em rascunho e opcionalmente semeia categoria/lote. */
async function criarEvento(opts: {
  status?: "rascunho" | "publicado";
  comCategoria?: boolean;
  comLote?: boolean;
}) {
  const n = ++seq;
  const [ev] = await db
    .insert(schema.eventos)
    .values({
      organizadorId: orgId,
      nome: `Evento ${n}`,
      slug: `evento-${n}`,
      dataInicio: "2026-09-20",
      status: opts.status ?? "rascunho",
    })
    .returning();

  if (opts.comCategoria) {
    await db.insert(schema.categorias).values({
      eventoId: ev.id,
      nome: "Adulto / Masculino / Preta / Leve",
      sexo: "masculino",
      faixa: "preta",
      classeIdade: "adulto",
    });
  }
  if (opts.comLote) {
    await db.insert(schema.lotes).values({
      eventoId: ev.id,
      nome: "1º lote",
      precoCentavos: 12000,
      inicio: new Date("2026-01-01T00:00:00Z"),
      fim: new Date("2026-09-19T23:59:59Z"),
    });
  }
  return ev.id;
}

async function contar(eventoId: string) {
  const [ins, lts, chvs, ars] = await Promise.all([
    db.query.inscricoes.findMany({ where: eq(schema.inscricoes.eventoId, eventoId) }),
    db.query.lutas.findMany({}),
    db.query.chaves.findMany({}),
    db.query.areas.findMany({ where: eq(schema.areas.eventoId, eventoId) }),
  ]);
  return {
    inscricoes: ins.length,
    lutas: lts.length,
    chaves: chvs.length,
    areas: ars.length,
  };
}

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db, { migrationsFolder: "./drizzle" });
  const [org] = await db
    .insert(schema.usuarios)
    .values({ nome: "Org", email: "org-pub@t.dev", ehOrganizador: true })
    .returning();
  orgId = org.id;
});

describe("publicarEventoCore — publica sem atletas/lutas/chaves/áreas", () => {
  it("publica um evento com categoria + lote e nada mais", async () => {
    const eventoId = await criarEvento({ comCategoria: true, comLote: true });

    // pré-condição: realmente não há atletas, lutas, chaves nem áreas
    expect(await contar(eventoId)).toEqual({
      inscricoes: 0,
      lutas: 0,
      chaves: 0,
      areas: 0,
    });

    await expect(publicarEventoCore(db, eventoId)).resolves.toBeUndefined();

    const ev = await db.query.eventos.findFirst({
      where: eq(schema.eventos.id, eventoId),
    });
    expect(ev?.status).toBe("publicado");
  });

  it("bloqueia sem categoria", async () => {
    const eventoId = await criarEvento({ comCategoria: false, comLote: true });
    expect(await motivoNaoPublicavel(db, eventoId)).toMatch(/1 categoria/i);
    await expect(publicarEventoCore(db, eventoId)).rejects.toThrow(/1 categoria/i);
  });

  it("bloqueia sem lote de inscrição", async () => {
    const eventoId = await criarEvento({ comCategoria: true, comLote: false });
    expect(await motivoNaoPublicavel(db, eventoId)).toMatch(/1 lote/i);
    await expect(publicarEventoCore(db, eventoId)).rejects.toThrow(/1 lote/i);
  });

  it("não republica um evento já publicado", async () => {
    const eventoId = await criarEvento({
      status: "publicado",
      comCategoria: true,
      comLote: true,
    });
    await expect(publicarEventoCore(db, eventoId)).rejects.toThrow(/já publicado/i);
  });
});
