import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes, lotes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import {
  criarLote,
  encerrarInscricoes,
  excluirCategoria,
  excluirLote,
  gerarCategoriasCbjj,
  publicarEvento,
} from "../actions";

const moedaFmt: Record<string, Intl.NumberFormat> = {};
function dinheiro(centavos: number, moeda: string) {
  moedaFmt[moeda] ??= new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  });
  return moedaFmt[moeda].format(centavos / 100);
}

export default async function PaginaEvento({
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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const [cats, lts, inscritos] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, id), orderBy: asc(lotes.inicio) }),
    db.query.inscricoes.findMany({ where: eq(inscricoes.eventoId, id) }),
  ]);

  const confirmadas = inscritos.filter((i) => i.status === "confirmada").length;

  return (
    <div className="space-y-10">
      {erro && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{evento.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(`${evento.dataInicio}T12:00:00`).toLocaleDateString("pt-BR")}
            {evento.cidade ? ` · ${evento.cidade}/${evento.uf ?? ""}` : ""} · {evento.moeda}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{evento.status}</Badge>
          {evento.status === "rascunho" && (
            <form action={publicarEvento.bind(null, evento.id)}>
              <Button variant="success">Publicar evento</Button>
            </form>
          )}
          {evento.status === "publicado" && (
            <form action={encerrarInscricoes.bind(null, evento.id)}>
              <Button variant="outline">Encerrar inscrições</Button>
            </form>
          )}
          <Link
            href={`/organizador/eventos/${evento.id}/inscricoes`}
            className={buttonVariants({ variant: "outline" })}
          >
            Inscrições
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/areas`}
            className={buttonVariants({ variant: "outline" })}
          >
            Áreas
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/checkin`}
            className={buttonVariants({ variant: "outline" })}
          >
            Check-in
          </Link>
          <Link
            href={`/organizador/eventos/${evento.id}/chaves`}
            className={buttonVariants()}
          >
            Chaves →
          </Link>
        </div>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Inscrições confirmadas", confirmadas],
          ["Categorias", cats.length],
          ["Lotes", lts.length],
        ].map(([rotulo, valor]) => (
          <Card key={rotulo}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{rotulo}</p>
              <p className="mt-1 text-3xl font-bold">{valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* lotes */}
      <section>
        <h2 className="text-lg font-bold">Lotes de inscrição</h2>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            {lts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lote — crie ao menos um para publicar o evento.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border bg-card">
                {lts.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{l.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.inicio.toLocaleDateString("pt-BR")} →{" "}
                        {l.fim.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {dinheiro(l.precoCentavos, evento.moeda)}
                        </p>
                        {l.precoSegundaInscricaoCentavos != null && (
                          <p className="text-xs text-muted-foreground">
                            2ª inscrição:{" "}
                            {dinheiro(l.precoSegundaInscricaoCentavos, evento.moeda)}
                          </p>
                        )}
                      </div>
                      <form action={excluirLote.bind(null, evento.id, l.id)}>
                        <button className="text-xs text-destructive hover:underline">
                          excluir
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Card>
            <CardContent className="p-5">
              <form action={criarLote.bind(null, evento.id)}>
                <p className="text-sm font-semibold">Novo lote</p>
                <div className="mt-3 space-y-3">
                  <Input name="nome" required placeholder="1º lote / Early bird" />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        Preço ({evento.moeda})
                      </span>
                      <Input name="preco" type="number" step="0.01" min="1" required className="mt-1" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        2ª inscrição (opcional)
                      </span>
                      <Input name="precoSegunda" type="number" step="0.01" min="0" className="mt-1" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Início</span>
                      <Input name="inicio" type="datetime-local" required className="mt-1" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Fim</span>
                      <Input name="fim" type="datetime-local" required className="mt-1" />
                    </label>
                  </div>
                  <Button>Adicionar lote</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* categorias */}
      <section>
        <h2 className="text-lg font-bold">
          Categorias{" "}
          <span className="font-normal text-muted-foreground">({cats.length})</span>
        </h2>

        <Card className="mt-4">
          <CardContent className="p-5">
            <form action={gerarCategoriasCbjj.bind(null, evento.id)}>
              <p className="text-sm font-semibold">Gerador de grade CBJJ</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Marque classes, sexos e faixas — o produto cartesiano com a tabela
                de pesos vira a grade (cada classe só gera as faixas permitidas
                para ela). Confira os limites com o regulamento do seu evento —
                as categorias são editáveis.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-6 text-sm">
                <fieldset>
                  <legend className="text-xs font-medium uppercase text-muted-foreground">
                    Classes
                  </legend>
                  <div className="mt-2 space-y-1">
                    {CLASSES_IDADE.map((c) => (
                      <label key={c.id} className="flex items-center gap-2">
                        <input type="checkbox" name="classes" value={c.id} defaultChecked={c.id === "adulto"} />
                        {c.nome}
                        <span className="text-xs text-muted-foreground">
                          ({c.idadeMin}
                          {c.idadeMax ? `–${c.idadeMax}` : "+"})
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-xs font-medium uppercase text-muted-foreground">
                    Sexo
                  </legend>
                  <div className="mt-2 space-y-1">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="sexos" value="masculino" defaultChecked /> Masculino
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="sexos" value="feminino" defaultChecked /> Feminino
                    </label>
                  </div>
                  <label className="mt-4 flex items-center gap-2 font-medium">
                    <input type="checkbox" name="incluirAbsoluto" /> Incluir absoluto
                  </label>
                </fieldset>

                <fieldset>
                  <legend className="text-xs font-medium uppercase text-muted-foreground">
                    Faixas
                  </legend>
                  <div className="mt-2 space-y-1">
                    {FAIXAS.map((f) => (
                      <label key={f} className="flex items-center gap-2 capitalize">
                        <input type="checkbox" name="faixas" value={f} defaultChecked={f === "branca" || f === "azul"} />
                        {f}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <Button className="mt-5">Gerar categorias</Button>
            </form>
          </CardContent>
        </Card>

        {cats.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border bg-card p-5 text-sm">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-border py-1.5">
                <span>{c.nome}</span>
                <form action={excluirCategoria.bind(null, evento.id, c.id)}>
                  <button className="text-xs text-destructive hover:underline">excluir</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
