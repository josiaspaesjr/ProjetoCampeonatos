import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos } from "@/db/schema";
import { SkewTexto } from "@/components/marca";
import { Badge } from "@/components/ui/badge";
import { getUsuarioAtual } from "@/lib/auth";
import { dataCurta } from "@/lib/datas";

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
    <div className="mx-auto max-w-4xl px-6 py-11">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
            Painel do organizador
          </div>
          <h1 className="disp text-[56px]">Meus eventos</h1>
        </div>
        <Link
          href="/organizador/eventos/novo"
          className="-skew-x-9 bg-brand px-6 py-3 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white"
        >
          <SkewTexto>+ Novo evento</SkewTexto>
        </Link>
      </div>

      {meusEventos.length === 0 ? (
        <div className="mt-14 border border-dashed border-white/16 p-12 text-center">
          <p className="disp text-[32px] text-white/30">Nenhum evento ainda</p>
          <p className="mt-2 text-[15px] font-medium text-muted-2">
            Crie seu primeiro campeonato e comece a receber inscrições.
          </p>
        </div>
      ) : (
        <ul className="mt-7 border border-white/10 bg-surface">
          {meusEventos.map((e) => (
            <li key={e.id} className="border-b border-white/6 last:border-b-0">
              <Link
                href={`/organizador/eventos/${e.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-hover-row"
              >
                <div className="min-w-0">
                  <p className="truncate font-cond text-[22px] font-semibold uppercase">
                    {e.nome}
                  </p>
                  <p className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
                    {dataCurta(e.dataInicio)}
                    {e.cidade ? ` · ${e.cidade}/${e.uf ?? ""}` : ""}
                  </p>
                </div>
                <Badge
                  variant={e.status === "rascunho" ? "secondary" : "default"}
                >
                  {rotuloStatus[e.status] ?? e.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
