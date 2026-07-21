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
import { minutosParaHHMM } from "@/lib/cronograma/dias";
import {
  EstruturadorAreas,
  type CategoriaView,
} from "@/components/organizador/estruturador-areas";
import {
  estruturarAreas,
  estruturarPorDia,
  reordenarLutasDaArea,
  salvarDiasEvento,
} from "./actions";

/** "YYYY-MM-DD" → "dd/mm" */
function dataLabel(data: string): string {
  const [, mm, dd] = data.slice(0, 10).split("-");
  return dd && mm ? `${dd}/${mm}` : data;
}

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

  const evento = await eventoGerenciavel(db, id, usuario.id);
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

  // dias configurados (ou uma linha default para o organizador preencher)
  const dias = diasRows.length
    ? diasRows.map((d) => ({
        data: d.data,
        inicio: minutosParaHHMM(d.inicioMinutos),
        fim: minutosParaHHMM(d.fimMinutos),
      }))
    : [{ data: evento.dataInicio, inicio: "09:00", fim: "18:00" }];

  // dias distintos (uma linha por data de calendário) para o modo "Por dia"
  const diasDistintos = [...new Set(dias.map((d) => d.data.slice(0, 10)))]
    .sort()
    .map((data) => ({ data, label: dataLabel(data) }));

  // dimensões presentes na grade (só o que existe aparece nos filtros por dia)
  const classesPresentes = new Set(cats.map((c) => c.classeIdade));
  const faixasPresentes = new Set<string>(
    cats.flatMap((c) => (c.faixa ? [c.faixa] : [])),
  );
  const dimensoes = {
    classes: CLASSES_IDADE.filter((c) => classesPresentes.has(c.id)).map((c) => ({
      id: c.id,
      nome: nomeDaClasse(c.id),
    })),
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
  const modoInicial = cats.some((c) => c.dataFixada != null) ? "porDia" : "auto";

  return (
    <EstruturadorAreas
      categorias={categoriasView}
      numAreasInicial={evento.numAreas ?? (todasAreas.length || null)}
      base={`/organizador/eventos/${id}`}
      eventoNome={evento.nome}
      cronograma={cronograma}
      dias={dias}
      diasDistintos={diasDistintos}
      dimensoes={dimensoes}
      categoriasFiltro={categoriasFiltro}
      modoInicial={modoInicial}
      erro={erro}
      estruturar={estruturarAreas.bind(null, id)}
      estruturarPorDia={estruturarPorDia.bind(null, id)}
      salvarDias={salvarDiasEvento.bind(null, id)}
      reordenar={reordenarLutasDaArea.bind(null, id)}
    />
  );
}
