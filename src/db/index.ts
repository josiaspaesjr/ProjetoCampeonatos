import * as schema from "./schema";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Conexão com o banco.
 *
 * - Com DATABASE_URL definida (produção/staging): Postgres real via postgres-js.
 * - Sem DATABASE_URL (dev local): PGlite — Postgres embutido, persistido em
 *   ./.pglite, com migrações aplicadas automaticamente no boot.
 *
 * Singleton em globalThis para sobreviver ao HMR do Next em dev.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

async function criarDbPostgres(url: string): Promise<Db> {
  const [{ drizzle }, { default: postgres }] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres"),
  ]);
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema }) as unknown as Db;
}

async function criarDbPglite(): Promise<Db> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const client = new PGlite("./.pglite");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db as unknown as Db;
}

const globalDb = globalThis as unknown as { __bjjcampDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalDb.__bjjcampDb) {
    const url = process.env.DATABASE_URL;
    globalDb.__bjjcampDb = url ? criarDbPostgres(url) : criarDbPglite();
  }
  return globalDb.__bjjcampDb;
}
