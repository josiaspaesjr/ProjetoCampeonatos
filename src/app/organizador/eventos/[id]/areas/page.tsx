import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, eventos } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { agruparEOrdenar } from "@/lib/categorias/distribuicao-areas";
import {
  EstruturadorAreas,
  type GrupoView,
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

  // grupos na ordem do dia (extremos → meio), enviados enxutos ao cliente
  const grupos: GrupoView[] = agruparEOrdenar(
    cats.map((c) => ({
      id: c.id,
      classeIdade: c.classeIdade,
      sexo: c.sexo,
      faixa: c.faixa,
      tipo: c.tipo,
      limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
    })),
  ).map((g) => ({
    chave: g.chave,
    classeNome: g.classeNome,
    onda: g.onda,
    sexo: g.sexo,
    faixa: g.faixa,
    pesos: g.pesos,
  }));

  return (
    <EstruturadorAreas
      grupos={grupos}
      totalCategorias={cats.length}
      numAreasInicial={evento.numAreas}
      estruturado={evento.numAreas != null}
      base={`/organizador/eventos/${id}`}
      areaIds={todasAreas.map((a) => a.id)}
      estruturar={estruturarAreas.bind(null, id)}
    />
  );
}
