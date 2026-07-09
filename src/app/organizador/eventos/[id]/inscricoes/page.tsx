import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getUsuarioAtual } from "@/lib/auth";
import { FAIXAS } from "@/lib/categorias/cbjj";
import {
  cancelarInscricao,
  fundirCategorias,
  inscricaoManual,
  moverInscricao,
  reembolsarInscricao,
} from "./actions";

const rotuloStatus: Record<string, [string, BadgeProps["variant"]]> = {
  pendente_pagamento: ["Pendente", "warning"],
  confirmada: ["Confirmada", "success"],
  cancelada: ["Cancelada", "secondary"],
  reembolsada: ["Reembolsada", "secondary"],
};

export default async function PaginaInscricoes({
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

  const [lista, cats] = await Promise.all([
    db.query.inscricoes.findMany({
      where: eq(inscricoes.eventoId, id),
      orderBy: desc(inscricoes.criadoEm),
    }),
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
  ]);
  const abertas = cats.filter((c) => c.status === "aberta");
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  const ativasPorCategoria = new Map<string, number>();
  for (const i of lista) {
    if (i.status === "confirmada" || i.status === "pendente_pagamento") {
      ativasPorCategoria.set(
        i.categoriaId,
        (ativasPorCategoria.get(i.categoriaId) ?? 0) + 1,
      );
    }
  }
  const esvaziadas = abertas.filter(
    (c) =>
      (ativasPorCategoria.get(c.id) ?? 0) > 0 &&
      (ativasPorCategoria.get(c.id) ?? 0) < c.minInscritos,
  );

  return (
    <div className="space-y-10">
      <p className="font-cond text-[15px] uppercase tracking-[0.05em] text-muted-2">
        {lista.length} inscriç{lista.length === 1 ? "ão" : "ões"} no total
      </p>

      {esvaziadas.length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-warning/15 p-5">
          <p className="font-semibold text-warning-foreground">
            Categorias abaixo do mínimo de inscritos
          </p>
          <p className="mt-1 text-xs text-warning-foreground/80">
            Funda em outra categoria (move os atletas e fecha a origem) ou
            reembolse os inscritos.
          </p>
          <ul className="mt-3 space-y-2">
            {esvaziadas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {c.nome}{" "}
                  <span className="text-warning-foreground/80">
                    ({ativasPorCategoria.get(c.id)} de {c.minInscritos} mín.)
                  </span>
                </span>
                <form
                  action={fundirCategorias.bind(null, id, c.id)}
                  className="flex items-center gap-2"
                >
                  <NativeSelect name="destinoId" required className="h-8 w-auto text-xs">
                    <option value="">Fundir em…</option>
                    {abertas
                      .filter((d) => d.id !== c.id && d.sexo === c.sexo)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome}
                        </option>
                      ))}
                  </NativeSelect>
                  <Button size="sm">Fundir</Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <ul className="divide-y divide-border rounded-xl border bg-card">
          {lista.map((i) => {
            const [rotulo, variante] = rotuloStatus[i.status] ?? [i.status, "outline" as const];
            const ativa = i.status === "confirmada" || i.status === "pendente_pagamento";
            return (
              <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {i.nomeAtleta}
                    <span className="ml-2 font-normal capitalize text-muted-foreground">
                      {i.faixa}
                      {i.academiaNome ? ` · ${i.academiaNome}` : ""}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nomeCategoria.get(i.categoriaId)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={variante}>{rotulo}</Badge>

                  {ativa && (
                    <form
                      action={moverInscricao.bind(null, id, i.id)}
                      className="flex items-center gap-1"
                    >
                      <NativeSelect
                        name="categoriaId"
                        required
                        defaultValue=""
                        className="h-8 w-44 text-xs"
                      >
                        <option value="" disabled>
                          Mover para…
                        </option>
                        {abertas
                          .filter((c) => c.id !== i.categoriaId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </NativeSelect>
                      <Button variant="outline" size="sm">
                        OK
                      </Button>
                    </form>
                  )}

                  {i.status === "pendente_pagamento" && (
                    <form action={cancelarInscricao.bind(null, id, i.id)}>
                      <button className="text-xs text-destructive hover:underline">
                        cancelar
                      </button>
                    </form>
                  )}
                  {i.status === "confirmada" && (
                    <form action={reembolsarInscricao.bind(null, id, i.id)}>
                      <button className="text-xs text-destructive hover:underline">
                        reembolsar
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
          {lista.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma inscrição ainda.
            </li>
          )}
        </ul>
      </section>

      <section className="max-w-2xl">
        <h2 className="text-lg font-bold">Inscrição manual</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Para atleta que pagou por fora (dinheiro, isenção) — entra direto como
          confirmada e fica registrada na auditoria.
        </p>
        <Card className="mt-4">
          <CardContent className="p-5">
            <form action={inscricaoManual.bind(null, id)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="nome" required placeholder="Nome completo" />
                <Input name="email" type="email" required placeholder="E-mail" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Input name="dataNascimento" type="date" required />
                <NativeSelect name="sexo" required defaultValue="">
                  <option value="" disabled>
                    Sexo
                  </option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </NativeSelect>
                <NativeSelect name="faixa" required defaultValue="">
                  <option value="" disabled>
                    Faixa
                  </option>
                  {FAIXAS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </NativeSelect>
                <Input name="academia" placeholder="Academia" />
              </div>
              <NativeSelect name="categoriaId" required defaultValue="">
                <option value="" disabled>
                  Categoria
                </option>
                {abertas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </NativeSelect>
              <Button>Inscrever manualmente</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
