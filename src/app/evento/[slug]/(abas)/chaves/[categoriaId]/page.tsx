import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";
import { getEventoPublico } from "@/lib/evento-publico";
import { getDicionario } from "@/lib/i18n/server";
import { BracketView, type AtletaInfo } from "@/components/bracket-view";
import { Podio } from "@/components/podio";

export default async function ChavePublica({
  params,
}: {
  params: Promise<{ slug: string; categoriaId: string }>;
}) {
  const { slug, categoriaId } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dic = await getDicionario();

  const db = await getDb();
  const categoria = await db.query.categorias.findFirst({
    where: and(eq(categorias.id, categoriaId), eq(categorias.eventoId, evento.id)),
  });
  if (!categoria) notFound();

  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  // chave em rascunho é privada do organizador
  if (!chave || chave.status === "rascunho") notFound();

  const linhas = await db.query.lutas.findMany({
    where: eq(lutas.chaveId, chave.id),
  });
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
    <div className="px-6 pb-20 pt-10 md:px-12">
      <Link
        href={`/evento/${evento.slug}/chaves`}
        className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2 transition-colors hover:text-brand"
      >
        ← {dic.chavesTab.todasAsChaves}
      </Link>
      <h1 className="disp mt-2 text-[40px]">{categoria.nome}</h1>

      {podio && (
        <div className="mt-6">
          <Podio
            podio={podio}
            atletas={atletas}
            labels={{ podio: dic.chavesTab.podio, campeao: dic.chavesTab.campeao }}
          />
        </div>
      )}

      <div className="mt-6">
        <BracketView
          lutas={linhas}
          atletas={atletas}
          formato={chave.formato}
          labels={dic.bracket}
        />
      </div>
    </div>
  );
}
