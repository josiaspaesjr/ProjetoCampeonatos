import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";

// lista eventos publicados direto do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const publicados = await db.query.eventos.findMany({
    where: eq(eventos.status, "publicado"),
    orderBy: asc(eventos.dataInicio),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-bold tracking-tight">BJJCAMP</span>
          <Link
            href="/organizador"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sou organizador
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Campeonatos abertos</h1>
        <p className="mt-1 text-muted-foreground">
          Inscreva-se com Pix em poucos cliques.
        </p>

        {publicados.length === 0 ? (
          <p className="mt-12 text-muted-foreground">
            Nenhum evento com inscrições abertas.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-4">
            {publicados.map((e) => (
              <li key={e.id}>
                <Link href={`/evento/${e.slug}`} className="block">
                  <Card className="transition-colors hover:border-ring">
                    <CardContent className="p-5">
                      <p className="text-lg font-semibold">{e.nome}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(`${e.dataInicio}T12:00:00`).toLocaleDateString("pt-BR")}
                        {e.cidade ? ` · ${e.cidade}/${e.uf ?? ""}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
