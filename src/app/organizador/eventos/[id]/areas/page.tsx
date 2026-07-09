import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, eventos } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { ordenarCategorias } from "@/lib/categorias/distribuicao-areas";
import { estimarCargaCategorias } from "@/lib/cronograma/carga-areas";
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
    db.query.areas.findMany({
      where: eq(areas.eventoId, id),
      orderBy: asc(areas.ordem),
    }),
  ]);

  const cargas = await estimarCargaCategorias(db, id, cats);

  // categorias já na ordem do dia (extremos → meio), enxutas para o cliente
  const categoriasView: CategoriaView[] = ordenarCategorias(
    cats.map((c) => ({
      classeIdade: c.classeIdade,
      sexo: c.sexo,
      faixa: c.faixa,
      tipo: c.tipo,
      limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
      carga: cargas.get(c.id)?.carga ?? 1,
      lutas: cargas.get(c.id)?.lutas ?? 0,
    })),
  ).map((c) => ({
    classeIdade: c.classeIdade,
    sexo: c.sexo,
    faixa: c.faixa,
    carga: c.carga,
    lutas: c.lutas,
  }));

  return (
    <EstruturadorAreas
      categorias={categoriasView}
      numAreasInicial={evento.numAreas}
      base={`/organizador/eventos/${id}`}
      areaIds={todasAreas.map((a) => a.id)}
      estruturar={estruturarAreas.bind(null, id)}
    />
  );
}
