/**
 * Seed de desenvolvimento — popula o evento mais recente do banco com
 * categorias, lote e inscrições de teste.
 *
 * Uso: node --env-file=.env.local scripts/seed-dev.ts
 */
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

const evento = await db.query.eventos.findFirst({
  orderBy: desc(schema.eventos.criadoEm),
});
if (!evento) throw new Error("Nenhum evento no banco — crie um pelo painel");
console.log(`Semeando evento: ${evento.nome}`);

// lote vigente
await db.insert(schema.lotes).values({
  eventoId: evento.id,
  nome: "1º Lote",
  precoCentavos: 10000,
  precoSegundaInscricaoCentavos: 5000,
  inicio: new Date(Date.now() - 24 * 3600 * 1000),
  fim: new Date(Date.now() + 30 * 24 * 3600 * 1000),
});

// duas categorias adulto masculino: azul leve (movimentada) e roxa leve (1 inscrito)
const [azulLeve] = await db
  .insert(schema.categorias)
  .values({
    eventoId: evento.id,
    nome: "Adulto / Masculino / Azul / Leve (até 76kg)",
    tipo: "peso",
    sexo: "masculino",
    faixa: "azul",
    classeIdade: "adulto",
    idadeMin: 18,
    limitePesoKg: "76.00",
  })
  .returning();
const [roxaLeve] = await db
  .insert(schema.categorias)
  .values({
    eventoId: evento.id,
    nome: "Adulto / Masculino / Roxa / Leve (até 76kg)",
    tipo: "peso",
    sexo: "masculino",
    faixa: "roxa",
    classeIdade: "adulto",
    idadeMin: 18,
    limitePesoKg: "76.00",
  })
  .returning();

const atletas: Array<{
  nome: string;
  academia: string;
  faixa: "azul" | "roxa";
  categoriaId: string;
  status: "confirmada" | "pendente_pagamento";
}> = [
  { nome: "Bruno Alves", academia: "Alliance SP", faixa: "azul", categoriaId: azulLeve.id, status: "confirmada" },
  { nome: "Diego Ramos", academia: "Gracie Barra", faixa: "azul", categoriaId: azulLeve.id, status: "confirmada" },
  { nome: "Felipe Nunes", academia: "Checkmat", faixa: "azul", categoriaId: azulLeve.id, status: "confirmada" },
  { nome: "Gustavo Rocha", academia: "Atos", faixa: "azul", categoriaId: azulLeve.id, status: "confirmada" },
  { nome: "Henrique Dias", academia: "Alliance SP", faixa: "azul", categoriaId: azulLeve.id, status: "pendente_pagamento" },
  { nome: "Igor Martins", academia: "Cicero Costha", faixa: "roxa", categoriaId: roxaLeve.id, status: "confirmada" },
];

for (const [i, a] of atletas.entries()) {
  const email = `seed-atleta-${i + 1}@dev.local`;
  const nascimento = `199${i}-04-1${i}`;

  const existente = await db.query.usuarios.findFirst({
    where: eq(schema.usuarios.email, email),
  });
  const usuario =
    existente ??
    (
      await db
        .insert(schema.usuarios)
        .values({
          nome: a.nome,
          email,
          dataNascimento: nascimento,
          sexo: "masculino",
          faixaAtual: a.faixa,
        })
        .returning()
    )[0];

  const academiaExistente = await db.query.academias.findFirst({
    where: eq(schema.academias.nome, a.academia),
  });
  const academia =
    academiaExistente ??
    (await db.insert(schema.academias).values({ nome: a.academia }).returning())[0];

  await db.insert(schema.inscricoes).values({
    usuarioId: usuario.id,
    eventoId: evento.id,
    categoriaId: a.categoriaId,
    status: a.status,
    nomeAtleta: a.nome,
    faixa: a.faixa,
    dataNascimento: nascimento,
    academiaId: academia.id,
    academiaNome: a.academia,
  });
  console.log(`  ${a.nome} (${a.faixa}, ${a.status})`);
}

console.log("Seed concluído.");
await client.end();
