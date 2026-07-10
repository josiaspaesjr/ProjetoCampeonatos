import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, eventos } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { ordenarCategorias } from "@/lib/categorias/distribuicao-areas";
import { montarCronogramaDoEvento } from "@/lib/cronograma/cronograma-areas";
import {
  EstruturadorAreas,
  type CategoriaView,
} from "@/components/organizador/estruturador-areas";
import { estruturarAreas } from "./actions";

export default async function PaginaAreas({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const [cats, todasAreas] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
    db.query.areas.findMany({ where: eq(areas.eventoId, id) }),
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

  return (
    <EstruturadorAreas
      categorias={categoriasView}
      numAreasInicial={evento.numAreas ?? (todasAreas.length || null)}
      base={`/organizador/eventos/${id}`}
      cronograma={cronograma}
      estruturar={estruturarAreas.bind(null, id)}
    />
  );
}
