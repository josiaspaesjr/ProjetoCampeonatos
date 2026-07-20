import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chaves } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { montarFilaDaArea, tempoDeLutaSegundos } from "@/lib/cronograma/fila";
import { BotaoTelaCheia } from "@/components/telao/botao-tela-cheia";
import { PlacarTablet } from "./placar-tablet";

export default async function PaginaPlacar({
  params,
}: {
  params: Promise<{ id: string; areaId: string }>;
}) {
  const { id, areaId } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const p = dic.admin.placar;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const fila = await montarFilaDaArea(db, areaId);
  if (!fila) notFound();

  const proxima = fila.fila.find((f) => f.pronta);

  if (!proxima) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-2xl font-bold">
          {p.nenhumLutaProntaEm} {fila.area.nome}
        </p>
        <p className="mt-2 text-muted-foreground">{p.filaVazia}</p>
        <Link
          href={`/organizador/eventos/${id}/areas`}
          className={`mt-6 inline-block ${buttonVariants()}`}
        >
          {p.voltarAsAreas}
        </Link>
      </div>
    );
  }

  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, proxima.categoria.id),
  });
  const a1 = proxima.luta.atleta1InscricaoId!;
  const a2 = proxima.luta.atleta2InscricaoId!;

  return (
    <div id="placar-operador">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/organizador/eventos/${id}/areas`} className="text-sm text-muted-foreground hover:underline">
          ← {dic.admin.nav.areas}
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {fila.area.nome} · {fila.fila.length}{" "}
            {fila.fila.length === 1 ? dic.lutasTab.luta : dic.lutasTab.lutas}{" "}
            {p.naFila}
          </p>
          <BotaoTelaCheia alvoId="placar-operador" variante="inline" />
        </div>
      </div>

      <PlacarTablet
        key={proxima.luta.id}
        eventoId={id}
        chaveId={chave!.id}
        lutaId={proxima.luta.id}
        categoriaNome={proxima.categoria.nome}
        duracaoSegundos={tempoDeLutaSegundos(proxima.categoria.faixa)}
        atleta1={{ id: a1, ...fila.atletas[a1] }}
        atleta2={{ id: a2, ...fila.atletas[a2] }}
        placarInicial={{
          l1: {
            pontos: proxima.luta.pontos1,
            vantagens: proxima.luta.vantagens1,
            punicoes: proxima.luta.punicoes1,
          },
          l2: {
            pontos: proxima.luta.pontos2,
            vantagens: proxima.luta.vantagens2,
            punicoes: proxima.luta.punicoes2,
          },
        }}
        cronometroInicial={{
          restanteSeg: proxima.luta.cronometroRestanteSeg,
          rodando: proxima.luta.cronometroRodando,
          atualizadoEmMs: proxima.luta.cronometroAtualizadoEm?.getTime() ?? null,
        }}
      />
    </div>
  );
}
