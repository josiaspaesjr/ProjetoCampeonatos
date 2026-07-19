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
import { Podio } from "@/components/podio";
import { BotaoAcao } from "@/components/ui/botao-acao";
import {
  lancarResultado,
  marcarMedalhasEntregues,
  salvarNotas,
} from "../../../actions";

/** "DD/MM/AAAA HH:MM" no fuso do Brasil (datas do app são pt-BR) */
function dataHoraBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

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
        <div className="mt-4">
          <Podio
            podio={podio}
            atletas={atletas}
            labels={{ podio: dic.chavesTab.podio, campeao: dic.chavesTab.campeao }}
          />

          {/* cerimônia: registrar entrega das medalhas */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {chave.medalhasEntreguesEm ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-md bg-success/15 px-3 py-1.5 text-sm font-medium text-success">
                  🏅 {dic.admin.chaves.medalhasEntregues} ·{" "}
                  {dataHoraBR(chave.medalhasEntreguesEm)}
                </span>
                <form
                  action={marcarMedalhasEntregues.bind(null, id, chave.id, false)}
                >
                  <BotaoAcao variant="ghost" size="sm">
                    {dic.admin.chaves.medalhasDesfazer}
                  </BotaoAcao>
                </form>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {dic.admin.chaves.medalhasPendentes}
                </span>
                <form
                  action={marcarMedalhasEntregues.bind(null, id, chave.id, true)}
                >
                  <BotaoAcao variant="outline" size="sm">
                    🏅 {dic.admin.chaves.medalhasMarcar}
                  </BotaoAcao>
                </form>
              </>
            )}
          </div>
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
          acaoNotas={
            chave.status === "publicada" || chave.status === "em_andamento"
              ? salvarNotas.bind(null, evento.id, chave.id)
              : undefined
          }
          numJurados={chave.config?.numJurados ?? undefined}
        />
      </div>
    </div>
  );
}
