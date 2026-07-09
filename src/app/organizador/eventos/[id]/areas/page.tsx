import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, chaves, eventos } from "@/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getUsuarioAtual } from "@/lib/auth";
import { duracaoDaCategoria, montarFilaDaArea, type FilaDaArea } from "@/lib/cronograma/fila";
import {
  alternarIntercalarRodadas,
  criarArea,
  designarCategoria,
  distribuirCategorias,
  excluirArea,
  removerCategoriaDaArea,
} from "./actions";

/** término estimado da área = hora da última luta + sua duração */
function fimEstimado(fila: FilaDaArea["fila"]): Date | null {
  const ultima = fila.at(-1);
  if (!ultima) return null;
  return new Date(
    ultima.horaEstimada.getTime() + duracaoDaCategoria(ultima.categoria) * 1000,
  );
}

const hora = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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

  const [todasAreas, semArea] = await Promise.all([
    db.query.areas.findMany({ where: eq(areas.eventoId, id), orderBy: asc(areas.ordem) }),
    db.query.categorias.findMany({
      where: and(eq(categorias.eventoId, id), isNull(categorias.areaId)),
      orderBy: asc(categorias.nome),
    }),
  ]);

  // só categorias com chave gerada entram na distribuição
  const chavesDoEvento = semArea.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, semArea.map((c) => c.id)),
      })
    : [];
  const comChave = new Set(chavesDoEvento.map((c) => c.categoriaId));
  const designaveis = semArea.filter((c) => comChave.has(c.id));

  const filas = await Promise.all(todasAreas.map((a) => montarFilaDaArea(db, a.id)));

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Distribua as categorias (com chave gerada) pelas áreas. A fila e os
        horários estimados se recalculam a cada luta encerrada.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-5">
            <form action={criarArea.bind(null, id)}>
              <p className="text-sm font-semibold">Nova área</p>
              <Input name="nome" required placeholder="Área 1" className="mt-2" />
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">Começa às</span>
                <Input name="horaInicio" type="datetime-local" className="mt-1" />
              </label>
              <Button className="mt-4">Criar área</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Categorias sem área{" "}
                <span className="font-normal text-muted-foreground">
                  ({designaveis.length} com chave gerada)
                </span>
              </p>
              {designaveis.length > 0 && todasAreas.length > 0 && (
                <form action={distribuirCategorias.bind(null, id)}>
                  <Button size="sm">Distribuir automaticamente</Button>
                </form>
              )}
            </div>
            {designaveis.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nada para distribuir — gere as chaves primeiro.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {designaveis.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{c.nome}</span>
                    <form
                      action={designarCategoria.bind(null, id)}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <input type="hidden" name="categoriaId" value={c.id} />
                      <NativeSelect
                        name="areaId"
                        required
                        defaultValue=""
                        className="h-8 w-auto text-xs"
                      >
                        <option value="" disabled>
                          Área…
                        </option>
                        {todasAreas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button variant="outline" size="sm">
                        Designar
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {filas.map((f) =>
          f ? (
            <Card key={f.area.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    {f.area.nome}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {f.fila.length > 0 &&
                        `${f.fila.length} luta(s) · termina ~${hora(fimEstimado(f.fila)!)}`}
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <form action={alternarIntercalarRodadas.bind(null, id, f.area.id)}>
                      <button
                        title="Intercalar as rodadas das categorias (slice) — dá descanso aos atletas entre as próprias lutas"
                        className={`text-xs hover:underline ${
                          f.area.intercalarRodadas
                            ? "font-medium text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        intercalar: {f.area.intercalarRodadas ? "ligado" : "desligado"}
                      </button>
                    </form>
                    <Link
                      href={`/organizador/eventos/${id}/areas/${f.area.id}/placar`}
                      className={buttonVariants({ variant: "success", size: "sm" })}
                    >
                      Operar placar
                    </Link>
                    <form action={excluirArea.bind(null, id, f.area.id)}>
                      <button className="text-xs text-destructive hover:underline">
                        excluir
                      </button>
                    </form>
                  </div>
                </div>

                {f.fila.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Fila vazia.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {f.fila.slice(0, 8).map((item, idx) => (
                      <li key={item.luta.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          <span className="mr-2 font-cond text-xs text-muted-foreground">
                            {hora(item.horaEstimada)}
                          </span>
                          {item.pronta
                            ? `${f.atletas[item.luta.atleta1InscricaoId!]?.nome} × ${f.atletas[item.luta.atleta2InscricaoId!]?.nome}`
                            : "aguardando vencedores"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {idx === 0 && item.pronta ? "próxima" : ""}
                        </span>
                      </li>
                    ))}
                    {f.fila.length > 8 && (
                      <li className="text-xs text-muted-foreground">
                        + {f.fila.length - 8} lutas…
                      </li>
                    )}
                  </ul>
                )}

                <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  Categorias:{" "}
                  {[...new Set(f.fila.map((i) => i.categoria.nome))].join(" · ") || "—"}
                </p>
                {[...new Set(f.fila.map((i) => i.categoria.id))].map((catId) => (
                  <form
                    key={catId}
                    action={removerCategoriaDaArea.bind(null, id, catId)}
                    className="mt-1 inline-block"
                  >
                    <button className="mr-3 text-xs text-muted-foreground hover:text-destructive hover:underline">
                      remover{" "}
                      {f.fila
                        .find((i) => i.categoria.id === catId)
                        ?.categoria.nome.split(" / ")
                        .at(-1)}
                    </button>
                  </form>
                ))}
              </CardContent>
            </Card>
          ) : null,
        )}
      </div>
    </div>
  );
}
