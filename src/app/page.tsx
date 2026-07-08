import Link from "next/link";
import { asc, eq } from "drizzle-orm";

// lista eventos publicados direto do banco — nunca servir versão estática
export const dynamic = "force-dynamic";
import { getDb } from "@/db";
import { eventos } from "@/db/schema";

export default async function Home() {
  const db = await getDb();
  const publicados = await db.query.eventos.findMany({
    where: eq(eventos.status, "publicado"),
    orderBy: asc(eventos.dataInicio),
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-bold tracking-tight">BJJCAMP</span>
          <Link href="/organizador" className="text-sm text-zinc-500 hover:text-zinc-900">
            Sou organizador
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Campeonatos abertos</h1>
        <p className="mt-1 text-zinc-500">Inscreva-se com Pix em poucos cliques.</p>

        {publicados.length === 0 ? (
          <p className="mt-12 text-zinc-500">Nenhum evento com inscrições abertas.</p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-4">
            {publicados.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/evento/${e.slug}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-400"
                >
                  <p className="text-lg font-semibold">{e.nome}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Date(`${e.dataInicio}T12:00:00`).toLocaleDateString("pt-BR")}
                    {e.cidade ? ` · ${e.cidade}/${e.uf ?? ""}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
