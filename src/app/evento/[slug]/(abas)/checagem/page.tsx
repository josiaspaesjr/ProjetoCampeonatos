import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes } from "@/db/schema";
import { getEventoPublico } from "@/lib/evento-publico";
import { dataCompleta } from "@/lib/datas";
import { getDicionario } from "@/lib/i18n/server";
import { ordenarCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import {
  AtletasLista,
  type AtletaCard,
  type DivisaoAtletas,
} from "@/components/evento/atletas-lista";

export default async function AbaChecagem({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento } = dados;
  const dat = (await getDicionario()).atletas;

  const db = await getDb();
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, evento.id),
  });
  const catIds = cats.map((c) => c.id);

  const [inscs, chavesRows] = await Promise.all([
    // inscritos ativos: exclui cancelada / reembolsada
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, evento.id),
        inArray(inscricoes.status, ["confirmada", "pendente_pagamento"]),
      ),
      orderBy: asc(inscricoes.nomeAtleta),
    }),
    catIds.length
      ? db.query.chaves.findMany({
          where: inArray(chaves.categoriaId, catIds),
        })
      : Promise.resolve([]),
  ]);

  // chave já gerada (mesmo em rascunho) → a categoria está fechada: só quem
  // estava confirmado entrou no sorteio, então os pendentes somem da checagem
  const catComChaveGerada = new Set(chavesRows.map((c) => c.categoriaId));
  // categorias com chave publicada → ganham o atalho "Ver chave"
  const catComChave = new Set(
    chavesRows.filter((c) => c.status !== "rascunho").map((c) => c.categoriaId),
  );

  // agrupa os inscritos por categoria (divisão), escondendo os pendentes das
  // categorias que já foram chaveadas
  const porCat = new Map<string, typeof inscs>();
  for (const i of inscs) {
    if (i.status !== "confirmada" && catComChaveGerada.has(i.categoriaId))
      continue;
    const arr = porCat.get(i.categoriaId);
    if (arr) arr.push(i);
    else porCat.set(i.categoriaId, [i]);
  }

  // ordem canônica de exibição: classe → sexo (feminino primeiro) → faixa → peso
  const divisoes: DivisaoAtletas[] = ordenarCategoriasExibicao(cats)
    .filter((c) => porCat.has(c.id))
    .map((c) => {
      const lista = porCat.get(c.id)!;
      const confirmados = lista.filter((i) => i.status === "confirmada").length;
      const atletas: AtletaCard[] = lista.map((i) => ({
        id: i.id,
        nome: i.nomeAtleta,
        academia: i.academiaNome,
        divisao: c.nome,
        faixa: i.faixa,
        pais: i.pais,
        status: i.status === "confirmada" ? "confirmada" : "pendente_pagamento",
      }));
      return {
        categoriaId: c.id,
        titulo: c.nome,
        faixa: c.faixa,
        confirmados,
        pendentes: lista.length - confirmados,
        chaveHref: catComChave.has(c.id)
          ? `/evento/${evento.slug}/chaves/${c.id}`
          : null,
        atletas,
      };
    });

  // totais do topo refletem o que está visível (pendentes de categoria chaveada
  // já foram descartados acima)
  let totalConfirmados = 0;
  let totalPendentes = 0;
  for (const d of divisoes) {
    totalConfirmados += d.confirmados;
    totalPendentes += d.pendentes;
  }

  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <div className="mb-6">
        <h1 className="disp text-[46px]">{dat.titulo}</h1>
        <p className="font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
          {dat.subtitulo}
        </p>
      </div>
      <AtletasLista
        divisoes={divisoes}
        evento={{
          nome: evento.nome,
          local: [evento.cidade, evento.uf].filter(Boolean).join(" · "),
          data: dataCompleta(evento.dataInicio),
        }}
        totalConfirmados={totalConfirmados}
        totalPendentes={totalPendentes}
      />
    </div>
  );
}
