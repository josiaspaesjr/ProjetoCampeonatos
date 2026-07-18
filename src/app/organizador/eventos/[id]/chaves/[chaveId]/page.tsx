import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";
import { BracketView, type AtletaInfo } from "@/components/bracket-view";
import { lancarResultado } from "../../../actions";

export default async function PaginaChave({
  params,
}: {
  params: Promise<{ id: string; chaveId: string }>;
}) {
  const { id, chaveId } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const chave = await db.query.chaves.findFirst({ where: eq(chaves.id, chaveId) });
  if (!chave) notFound();

  const [categoria, linhas] = await Promise.all([
    db.query.categorias.findFirst({ where: eq(categorias.id, chave.categoriaId) }),
    db.query.lutas.findMany({ where: eq(lutas.chaveId, chaveId) }),
  ]);

  const idsInscricoes = [
    ...new Set(
      linhas.flatMap((l) =>
        [l.atleta1InscricaoId, l.atleta2InscricaoId].filter(
          (v): v is string => v !== null,
        ),
      ),
    ),
  ];
  const inscritos = idsInscricoes.length
    ? await db.query.inscricoes.findMany({
        where: inArray(inscricoes.id, idsInscricoes),
      })
    : [];
  const atletas: Record<string, AtletaInfo> = Object.fromEntries(
    inscritos.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
  );

  const podio =
    chave.status === "concluida" ? calcularPodioDaChave(chave, linhas) : null;

  return (
    <div>
      <Link
        href={`/organizador/eventos/${id}/chaves`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {dic.chavesTab.todasAsChaves}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">{categoria?.nome}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {dic.admin.chaves.status[chave.status] ?? chave.status} · seed{" "}
          {chave.seedSorteio.slice(0, 8)}
        </span>
      </div>

      {podio && (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-5">
          <p className="font-semibold text-success">{dic.chavesTab.podio}</p>
          <ol className="mt-2 space-y-1 text-sm">
            <li>🥇 {podio.primeiro && atletas[podio.primeiro]?.nome}</li>
            <li>🥈 {podio.segundo && atletas[podio.segundo]?.nome}</li>
            {podio.terceiros.map((t) => (
              <li key={t}>🥉 {atletas[t]?.nome}</li>
            ))}
          </ol>
        </div>
      )}

      {chave.status === "rascunho" && (
        <p className="mt-4 rounded-md bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
          {dic.admin.chaves.chaveRascunhoAviso}
        </p>
      )}

      <div className="mt-6">
        <BracketView
          lutas={linhas}
          atletas={atletas}
          formato={chave.formato}
          labels={dic.bracket}
          acaoResultado={
            chave.status === "publicada" || chave.status === "em_andamento"
              ? lancarResultado.bind(null, evento.id, chave.id)
              : undefined
          }
        />
      </div>
    </div>
  );
}
