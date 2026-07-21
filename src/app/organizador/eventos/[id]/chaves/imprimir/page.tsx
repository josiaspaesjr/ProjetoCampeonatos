import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { ordenarCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import type { AtletaInfo } from "@/components/bracket-view";
import {
  ChavesParaImprimir,
  type ChaveImprimivel,
} from "@/components/chaves/chaves-para-imprimir";

/**
 * Página de impressão de TODAS as chaves do evento (aberta em nova aba pelo botão
 * "Imprimir chaves"). Reusa o `BracketView` da tela num tema claro, uma chave por
 * página. Ordem canônica de exibição (classe → sexo F→M → faixa → peso).
 */
export default async function PaginaImprimirChaves({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, id),
  });
  const chavesRows = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];
  const chaveIds = chavesRows.map((c) => c.id);
  const lutasRows = chaveIds.length
    ? await db.query.lutas.findMany({ where: inArray(lutas.chaveId, chaveIds) })
    : [];
  const confirmadas = await db.query.inscricoes.findMany({
    where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
  });

  const atletas: Record<string, AtletaInfo> = Object.fromEntries(
    confirmadas.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
  );
  const chavePorCat = new Map(chavesRows.map((ch) => [ch.categoriaId, ch]));
  const lutasPorChave = new Map<string, typeof lutasRows>();
  for (const l of lutasRows) {
    const arr = lutasPorChave.get(l.chaveId);
    if (arr) arr.push(l);
    else lutasPorChave.set(l.chaveId, [l]);
  }

  const itens: ChaveImprimivel[] = ordenarCategoriasExibicao(
    cats.filter((c) => chavePorCat.has(c.id)),
  ).map((c) => {
    const ch = chavePorCat.get(c.id)!;
    return {
      categoriaNome: c.nome,
      formato: ch.formato,
      lutas: lutasPorChave.get(ch.id) ?? [],
      numJurados: ch.config?.numJurados ?? undefined,
    };
  });

  return (
    <ChavesParaImprimir
      itens={itens}
      atletas={atletas}
      eventoNome={evento.nome}
      tituloPagina={dic.admin.chaves.chavesTitulo}
      labels={dic.bracket}
      semChaves={dic.admin.chaves.semChave}
    />
  );
}
