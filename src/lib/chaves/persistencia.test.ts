import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { gerarChaveParaCategoria } from "./persistencia";

/**
 * Regra: **só gera chave com atleta pago** — na geração, entram apenas as
 * inscrições `confirmada` (pagamento aprovado). As pendentes de pagamento não
 * podem aparecer na chave, e uma categoria sem 2+ pagos não gera chave.
 */

let db: Db;
let eventoId: string;
let seq = 0;

/** Cria uma categoria com `pagos` inscrições confirmadas e `naoPagos` pendentes. */
async function criarCategoriaCom(pagos: number, naoPagos: number) {
  const [cat] = await db
    .insert(schema.categorias)
    .values({
      eventoId,
      nome: `Cat ${++seq}`,
      sexo: "masculino",
      faixa: "preta",
      classeIdade: "adulto",
    })
    .returning();

  const inserirInscricao = async (
    status: "confirmada" | "pendente_pagamento",
    i: number,
  ) => {
    const marca = `${status}-${seq}-${i}`;
    const [u] = await db
      .insert(schema.usuarios)
      .values({ nome: marca, email: `${marca}@t.dev` })
      .returning();
    const [insc] = await db
      .insert(schema.inscricoes)
      .values({
        usuarioId: u.id,
        eventoId,
        categoriaId: cat.id,
        status,
        nomeAtleta: marca,
        faixa: "preta",
        dataNascimento: "1996-01-01",
      })
      .returning();
    return insc.id;
  };

  const confirmadas: string[] = [];
  for (let i = 0; i < pagos; i++) {
    confirmadas.push(await inserirInscricao("confirmada", i));
  }
  const pendentes: string[] = [];
  for (let i = 0; i < naoPagos; i++) {
    pendentes.push(await inserirInscricao("pendente_pagamento", i));
  }
  return { categoriaId: cat.id, confirmadas, pendentes };
}

/** Conjunto de inscrições que aparecem como atleta em alguma luta da chave. */
async function participantesDaChave(chaveId: string): Promise<Set<string>> {
  const linhas = await db.query.lutas.findMany({
    where: eq(schema.lutas.chaveId, chaveId),
  });
  const ids = new Set<string>();
  for (const l of linhas) {
    if (l.atleta1InscricaoId) ids.add(l.atleta1InscricaoId);
    if (l.atleta2InscricaoId) ids.add(l.atleta2InscricaoId);
  }
  return ids;
}

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [org] = await db
    .insert(schema.usuarios)
    .values({ nome: "Org", email: "org-chaves@t.dev", ehOrganizador: true })
    .returning();
  const [ev] = await db
    .insert(schema.eventos)
    .values({
      organizadorId: org.id,
      nome: "Copa Chaves",
      slug: "copa-chaves",
      dataInicio: "2026-05-10",
      status: "publicado",
    })
    .returning();
  eventoId = ev.id;
});

describe("gerarChaveParaCategoria — só entra quem pagou (confirmada)", () => {
  it("mistura pagos e não pagos (round robin): só os pagos entram na chave", async () => {
    const { categoriaId, confirmadas, pendentes } = await criarCategoriaCom(3, 2);
    const chave = await gerarChaveParaCategoria(db, categoriaId);
    const participantes = await participantesDaChave(chave.id);

    for (const id of confirmadas) expect(participantes.has(id)).toBe(true);
    for (const id of pendentes) expect(participantes.has(id)).toBe(false);
    expect(participantes.size).toBe(confirmadas.length);
  });

  it("mistura pagos e não pagos (eliminação simples): só os pagos entram", async () => {
    const { categoriaId, confirmadas, pendentes } = await criarCategoriaCom(4, 3);
    const chave = await gerarChaveParaCategoria(db, categoriaId);
    const participantes = await participantesDaChave(chave.id);

    for (const id of confirmadas) expect(participantes.has(id)).toBe(true);
    for (const id of pendentes) expect(participantes.has(id)).toBe(false);
    expect(participantes.size).toBe(confirmadas.length);
  });

  it("menos de 2 pagos (1 pago + 3 pendentes): não gera chave", async () => {
    const { categoriaId } = await criarCategoriaCom(1, 3);
    await expect(gerarChaveParaCategoria(db, categoriaId)).rejects.toThrow(
      /chave_min_inscricoes/,
    );
  });

  it("ninguém pagou (0 pago + 2 pendentes): não gera chave", async () => {
    const { categoriaId } = await criarCategoriaCom(0, 2);
    await expect(gerarChaveParaCategoria(db, categoriaId)).rejects.toThrow(
      /chave_min_inscricoes/,
    );
  });
});
