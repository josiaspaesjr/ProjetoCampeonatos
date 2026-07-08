import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos } from "@/db/schema";
import { montarFilasDoEvento, type FilaDaArea } from "@/lib/cronograma/fila";
import { AutoRefresh } from "@/components/auto-refresh";

const hora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function ColunaArea({ fila, tv }: { fila: FilaDaArea; tv: boolean }) {
  const emAndamento = fila.fila.find(
    (i) =>
      i.pronta &&
      (i.luta.pontos1 > 0 || i.luta.pontos2 > 0 ||
        i.luta.vantagens1 > 0 || i.luta.vantagens2 > 0),
  ) ?? fila.fila.find((i) => i.pronta);

  const nome = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : "aguardando";

  return (
    <div className={`rounded-2xl ${tv ? "bg-zinc-900 p-6" : "border border-zinc-200 bg-white p-5"}`}>
      <p className={`font-bold ${tv ? "text-2xl text-white" : "text-lg"}`}>
        {fila.area.nome}
      </p>

      {emAndamento && (
        <div className={`mt-3 rounded-xl p-4 ${tv ? "bg-emerald-900/60" : "bg-emerald-50"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${tv ? "text-emerald-300" : "text-emerald-700"}`}>
            No tatame · {emAndamento.categoria.nome.split(" / ").slice(-2).join(" ")}
          </p>
          <div className={`mt-2 space-y-1 ${tv ? "text-xl text-white" : "text-sm"}`}>
            <p className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{nome(emAndamento.luta.atleta1InscricaoId)}</span>
              <span className="font-black tabular-nums">{emAndamento.luta.pontos1}</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="truncate font-medium">{nome(emAndamento.luta.atleta2InscricaoId)}</span>
              <span className="font-black tabular-nums">{emAndamento.luta.pontos2}</span>
            </p>
          </div>
        </div>
      )}

      <ul className={`mt-3 space-y-1.5 ${tv ? "text-lg text-zinc-200" : "text-sm"}`}>
        {fila.fila
          .filter((i) => i !== emAndamento)
          .slice(0, tv ? 6 : 10)
          .map((i) => (
            <li key={i.luta.id} className="flex items-center gap-2">
              <span className={`font-mono text-xs ${tv ? "text-zinc-400" : "text-zinc-400"}`}>
                ~{hora(i.horaEstimada)}
              </span>
              <span className="truncate">
                {i.pronta
                  ? `${nome(i.luta.atleta1InscricaoId)} × ${nome(i.luta.atleta2InscricaoId)}`
                  : `${i.categoria.nome.split(" / ").slice(-2).join(" ")} — aguardando`}
              </span>
            </li>
          ))}
        {fila.fila.length === 0 && (
          <li className={tv ? "text-zinc-400" : "text-zinc-500"}>Área concluída ✓</li>
        )}
      </ul>
    </div>
  );
}

export default async function CronogramaPublico({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tv?: string }>;
}) {
  const { slug } = await params;
  const { tv: tvParam } = await searchParams;
  const tv = tvParam === "1";

  const db = await getDb();
  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), ne(eventos.status, "rascunho")),
  });
  if (!evento) notFound();

  const filas = await montarFilasDoEvento(db, evento.id);

  const conteudo = (
    <>
      <AutoRefresh segundos={tv ? 5 : 10} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-bold ${tv ? "text-4xl text-white" : "text-2xl"}`}>
            {evento.nome}
          </h1>
          <p className={tv ? "text-zinc-400" : "text-sm text-zinc-500"}>
            Cronograma ao vivo — horários estimados, atualiza sozinho
          </p>
        </div>
        {!tv && (
          <Link
            href={`/evento/${evento.slug}/cronograma?tv=1`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
          >
            Modo telão
          </Link>
        )}
      </div>
      <div className={`mt-6 grid gap-6 ${filas.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {filas.map((f) => (
          <ColunaArea key={f.area.id} fila={f} tv={tv} />
        ))}
        {filas.length === 0 && (
          <p className={tv ? "text-zinc-400" : "text-zinc-500"}>
            O cronograma aparece aqui quando o organizador distribuir as chaves
            pelas áreas.
          </p>
        )}
      </div>
    </>
  );

  if (tv) {
    return (
      <div className="min-h-screen bg-black px-8 py-6">{conteudo}</div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-bold tracking-tight">BJJCAMP</Link>
          <Link href={`/evento/${evento.slug}`} className="text-sm text-zinc-500 hover:text-zinc-900">
            Página do evento
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{conteudo}</main>
    </div>
  );
}
