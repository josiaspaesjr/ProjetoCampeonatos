import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { historicoDoAtleta } from "./atleta";

/**
 * Semeia uma eliminação simples de 4 concluída:
 *   semi1: A vence B · semi2: C vence D · final: A vence C
 * Pódio esperado: ouro A, prata C, bronze B e D.
 */
async function semear(db: Db) {
  const [org] = await db
    .insert(schema.usuarios)
    .values({ nome: "Org", email: "org@t.dev", ehOrganizador: true })
    .returning();

  const atletas = await db
    .insert(schema.usuarios)
    .values(
      ["A", "B", "C", "D"].map((n) => ({ nome: n, email: `${n}@t.dev` })),
    )
    .returning();
  const [uA, uB, uC, uD] = atletas;

  const [evento] = await db
    .insert(schema.eventos)
    .values({
      organizadorId: org.id,
      nome: "Copa Teste",
      slug: "copa-teste",
      dataInicio: "2026-05-10",
      status: "publicado",
    })
    .returning();

  const [categoria] = await db
    .insert(schema.categorias)
    .values({
      eventoId: evento.id,
      nome: "Adulto / Masculino / Preta / Leve",
      sexo: "masculino",
      faixa: "preta",
      classeIdade: "adulto",
    })
    .returning();

  const insc = await db
    .insert(schema.inscricoes)
    .values(
      [uA, uB, uC, uD].map((u) => ({
        usuarioId: u.id,
        eventoId: evento.id,
        categoriaId: categoria.id,
        status: "confirmada" as const,
        nomeAtleta: u.nome,
        faixa: "preta" as const,
        dataNascimento: "1996-01-01",
      })),
    )
    .returning();
  const [iA, iB, iC, iD] = insc;

  const [chave] = await db
    .insert(schema.chaves)
    .values({
      categoriaId: categoria.id,
      formato: "eliminacao_simples",
      status: "concluida",
      seedSorteio: "teste",
    })
    .returning();

  const [final] = await db
    .insert(schema.lutas)
    .values({
      chaveId: chave.id,
      rodada: 2,
      posicao: 0,
      atleta1InscricaoId: iA.id,
      atleta2InscricaoId: iC.id,
      vencedorInscricaoId: iA.id,
      metodo: "pontos",
    })
    .returning();

  await db.insert(schema.lutas).values([
    {
      chaveId: chave.id,
      rodada: 1,
      posicao: 0,
      atleta1InscricaoId: iA.id,
      atleta2InscricaoId: iB.id,
      vencedorInscricaoId: iA.id,
      metodo: "pontos",
      proximaLutaId: final.id,
      proximaLutaSlot: 1,
    },
    {
      chaveId: chave.id,
      rodada: 1,
      posicao: 1,
      atleta1InscricaoId: iC.id,
      atleta2InscricaoId: iD.id,
      vencedorInscricaoId: iC.id,
      metodo: "pontos",
      proximaLutaId: final.id,
      proximaLutaSlot: 2,
    },
  ]);

  return { uA, uB, uC, uD };
}

describe("historicoDoAtleta", () => {
  let db: Db;
  let atletas: Awaited<ReturnType<typeof semear>>;

  beforeAll(async () => {
    const client = new PGlite();
    db = drizzle(client, { schema }) as unknown as Db;
    await migrate(db, { migrationsFolder: "./drizzle" });
    atletas = await semear(db);
  });

  it("campeão: ouro, 2 vitórias e 0 derrotas", async () => {
    const { participacoes, resumo } = await historicoDoAtleta(db, atletas.uA.id);
    expect(participacoes).toHaveLength(1);
    expect(participacoes[0].colocacao).toBe("ouro");
    expect(participacoes[0].vitorias).toBe(2);
    expect(participacoes[0].derrotas).toBe(0);
    expect(resumo.ouros).toBe(1);
    expect(resumo.podios).toBe(1);
    expect(resumo.campeonatos).toBe(1);
  });

  it("vice: prata, com 1 vitória e 1 derrota", async () => {
    const { participacoes } = await historicoDoAtleta(db, atletas.uC.id);
    expect(participacoes[0].colocacao).toBe("prata");
    expect(participacoes[0].vitorias).toBe(1);
    expect(participacoes[0].derrotas).toBe(1);
  });

  it("perdedores de semifinal: bronze", async () => {
    const b = await historicoDoAtleta(db, atletas.uB.id);
    const d = await historicoDoAtleta(db, atletas.uD.id);
    expect(b.participacoes[0].colocacao).toBe("bronze");
    expect(d.participacoes[0].colocacao).toBe("bronze");
    expect(b.participacoes[0].vitorias).toBe(0);
    expect(b.participacoes[0].derrotas).toBe(1);
  });

  it("atleta sem inscrições: histórico vazio", async () => {
    const { participacoes, resumo } = await historicoDoAtleta(
      db,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(participacoes).toEqual([]);
    expect(resumo.campeonatos).toBe(0);
  });

  it("gera link da chave quando publicada/concluída", async () => {
    const { participacoes } = await historicoDoAtleta(db, atletas.uA.id);
    expect(participacoes[0].chaveUrl).toContain("/evento/copa-teste/chaves/");
  });
});
