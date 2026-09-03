import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, eventoDias } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import {
  nomeDaClasse,
  ordenarCategorias,
} from "@/lib/categorias/distribuicao-areas";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import { categoriasParaRecomendacao } from "@/lib/cronograma/recomendacao";
import { COOKIE_RECOMENDACAO_AREAS } from "@/components/organizador/recomendacao-config";
import { minutosParaHHMM } from "@/lib/cronograma/dias";
import {
  EstruturadorAreas,
  type CategoriaView,
} from "@/components/organizador/estruturador-areas";
import { temposEfetivos } from "@/lib/cronograma/tempos";
import {
  estruturarAreas,
  estruturarPorDia,
  moverCategoriaParaArea,
  moverLutaParaArea,
  reordenarLutasDaArea,
} from "./actions";

export default async function PaginaAreas({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const db = await getDb();
  const usuario = await getUsuarioAtual();

  const evento = await eventoGerenciavel(db, id, usuario.id, "areas");
  if (!evento) notFound();

  const [cats, todasAreas, diasRows] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
    db.query.areas.findMany({ where: eq(areas.eventoId, id) }),
    db.query.eventoDias.findMany({
      where: eq(eventoDias.eventoId, id),
      orderBy: [asc(eventoDias.data), asc(eventoDias.inicioMinutos)],
    }),
  ]);

  // grade na ordem do dia (extremos → meio), enxuta para a legenda/resumo
  const categoriasView: CategoriaView[] = ordenarCategorias(
    cats.map((c) => ({
      classeIdade: c.classeIdade,
      sexo: c.sexo,
      faixa: c.faixa,
      tipo: c.tipo,
      limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
    })),
  ).map((c) => ({ classeIdade: c.classeIdade, sexo: c.sexo, faixa: c.faixa }));

  // cronograma real por área (categorias → lutas, horários e placar)
  const cronograma = await montarCronogramaDoEvento(db, id, evento.dataInicio);

  // quantos tatames as lutas previstas pedem para caber no período do evento
  const numAreasAtual = evento.numAreas ?? (todasAreas.length || null);
  // as lutas de cada categoria vêm contadas daqui (dependem das inscrições); o
  // cliente refaz a recomendação sozinho a cada mexida no assistente
  const categoriasRecomendacao = await categoriasParaRecomendacao(
    db,
    id,
    cats,
    evento.temposLuta,
  );
  // preferência de recolhido: semeada no servidor para não piscar aberto
  const recomendacaoRecolhida =
    (await cookies()).get(COOKIE_RECOMENDACAO_AREAS)?.value === "1";

  // dias configurados (ou uma linha default para o organizador preencher)
  const dias = diasRows.length
    ? diasRows.map((d) => ({
        data: d.data,
        inicio: minutosParaHHMM(d.inicioMinutos),
        fim: minutosParaHHMM(d.fimMinutos),
      }))
    : [{ data: evento.dataInicio, inicio: "09:00", fim: "18:00" }];

  // dimensões presentes na grade (só o que existe aparece nos filtros por dia)
  const classesPresentes = new Set(cats.map((c) => c.classeIdade));
  const faixasPresentes = new Set<string>(
    cats.flatMap((c) => (c.faixa ? [c.faixa] : [])),
  );
  const dimensoes = {
    classes: CLASSES_IDADE.filter((c) => classesPresentes.has(c.id)).map(
      (c) => ({
        id: c.id,
        nome: nomeDaClasse(c.id),
      }),
    ),
    sexos: ["masculino", "feminino"].filter((s) =>
      cats.some((c) => c.sexo === s),
    ),
    faixas: FAIXAS.filter((f) => faixasPresentes.has(f)),
    temAbsoluto: cats.some((c) => c.tipo === "absoluto"),
  };
  const categoriasFiltro = cats.map((c) => ({
    id: c.id,
    classeIdade: c.classeIdade,
    sexo: c.sexo,
    faixa: c.faixa,
    tipo: c.tipo,
  }));
  const modoInicial = cats.some((c) => c.dataFixada != null)
    ? "porDia"
    : "auto";

  return (
    <EstruturadorAreas
      categorias={categoriasView}
      numAreasInicial={numAreasAtual}
      categoriasRecomendacao={categoriasRecomendacao}
      recomendacaoRecolhida={recomendacaoRecolhida}
      base={`/organizador/eventos/${id}`}
      eventoNome={evento.nome}
      cronograma={cronograma}
      dias={dias}
      tempos={temposEfetivos(evento.temposLuta)}
      dimensoes={dimensoes}
      categoriasFiltro={categoriasFiltro}
      modoInicial={modoInicial}
      ordemClasses={evento.ordemClasses ?? null}
      erro={erro}
      estruturar={estruturarAreas.bind(null, id)}
      estruturarPorDia={estruturarPorDia.bind(null, id)}
      reordenar={reordenarLutasDaArea.bind(null, id)}
      moverLuta={moverLutaParaArea.bind(null, id)}
      moverCategoria={moverCategoriaParaArea.bind(null, id)}
    />
  );
}
