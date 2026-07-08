import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";

const rotuloStatus: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  inscricoes_encerradas: "Inscrições encerradas",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
};

export default async function PainelOrganizador() {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const meusEventos = await db.query.eventos.findMany({
    where: eq(eventos.organizadorId, usuario.id),
    orderBy: desc(eventos.criadoEm),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus eventos</h1>
        <Link
          href="/organizador/eventos/novo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Novo evento
        </Link>
      </div>

      {meusEventos.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500">
          <p className="text-lg font-medium">Nenhum evento ainda</p>
          <p className="mt-1 text-sm">
            Crie seu primeiro campeonato e comece a receber inscrições.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {meusEventos.map((e) => (
            <li key={e.id}>
              <Link
                href={`/organizador/eventos/${e.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium">{e.nome}</p>
                  <p className="text-sm text-zinc-500">
                    {new Date(`${e.dataInicio}T12:00:00`).toLocaleDateString("pt-BR")}
                    {e.cidade ? ` · ${e.cidade}/${e.uf ?? ""}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                  {rotuloStatus[e.status] ?? e.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
