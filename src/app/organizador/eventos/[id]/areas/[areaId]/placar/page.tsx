import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chaves, eventos } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { getUsuarioAtual } from "@/lib/auth";
import { getDicionario } from "@/lib/i18n/server";
import { duracaoLutaSegundos, montarFilaDaArea } from "@/lib/cronograma/fila";
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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/organizador/eventos/${id}/areas`} className="text-sm text-muted-foreground hover:underline">
          ← {dic.admin.nav.areas}
        </Link>
        <p className="text-sm font-medium text-muted-foreground">
          {fila.area.nome} · {fila.fila.length}{" "}
          {fila.fila.length === 1 ? dic.lutasTab.luta : dic.lutasTab.lutas}{" "}
          {p.naFila}
        </p>
      </div>

      <PlacarTablet
        key={proxima.luta.id}
        eventoId={id}
        chaveId={chave!.id}
        lutaId={proxima.luta.id}
        categoriaNome={proxima.categoria.nome}
        duracaoSegundos={duracaoLutaSegundos(proxima.categoria.faixa) - 60}
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
      />
    </div>
  );
}
