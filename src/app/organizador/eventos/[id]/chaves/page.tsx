import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { getUsuarioAtual } from "@/lib/auth";
import { formatoAutomatico } from "@/lib/chaves/persistencia";
import { gerarChave, gerarChavesEmLote, publicarChaves } from "../../actions";

const rotuloChave: Record<string, [string, BadgeProps["variant"]]> = {
  rascunho: ["Rascunho", "warning"],
  publicada: ["Publicada", "default"],
  em_andamento: ["Em andamento", "outline"],
  concluida: ["Concluída", "success"],
};

export default async function PaginaChaves({
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

  const [cats, confirmadas] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
    }),
  ]);
  const todasChaves = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];
  const chavePorCategoria = new Map(todasChaves.map((c) => [c.categoriaId, c]));

  const contagem = new Map<string, number>();
  for (const i of confirmadas) {
    contagem.set(i.categoriaId, (contagem.get(i.categoriaId) ?? 0) + 1);
  }

  const comInscritos = cats.filter((c) => (contagem.get(c.id) ?? 0) > 0);
  const rascunhos = todasChaves.filter((c) => c.status === "rascunho").length;
  const semChave = comInscritos.filter(
    (c) => (contagem.get(c.id) ?? 0) >= 2 && !chavePorCategoria.has(c.id),
  ).length;

  return (
    <div>
      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-sm text-muted-foreground">
          Categorias sem inscrições confirmadas ficam ocultas. Gere em
          rascunho, revise e publique — depois de publicada a chave não pode
          ser regenerada.
        </p>
        <div className="flex items-center gap-3">
          {semChave > 0 && (
            <form action={gerarChavesEmLote.bind(null, evento.id)}>
              <BotaoAcao>Gerar {semChave} chave(s) em lote</BotaoAcao>
            </form>
          )}
          {rascunhos > 0 && (
            <form action={publicarChaves.bind(null, evento.id)}>
              <BotaoAcao variant="success">Publicar {rascunhos} chave(s)</BotaoAcao>
            </form>
          )}
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border rounded-xl border bg-card">
        {comInscritos.map((c) => {
          const chave = chavePorCategoria.get(c.id);
          const qtd = contagem.get(c.id) ?? 0;
          const [rotulo, variante] = chave
            ? rotuloChave[chave.status]
            : (["Sem chave", "secondary"] as [string, BadgeProps["variant"]]);

          return (
            <li
              key={c.id}
              className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {qtd} confirmado(s)
                  {qtd === 1 && " — insuficiente para gerar chave"}
                  {chave
                    ? ` · ${chave.formato === "round_robin" ? "todos contra todos" : "eliminação simples"}`
                    : qtd >= 2 &&
                      ` · formato sugerido: ${formatoAutomatico(qtd) === "round_robin" ? "todos contra todos" : "eliminação simples"}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 max-sm:w-full">
                <Badge variant={variante}>{rotulo}</Badge>
                {qtd >= 2 && (!chave || chave.status === "rascunho") && (
                  <form action={gerarChave.bind(null, evento.id, c.id)}>
                    <BotaoAcao variant="outline" size="sm">
                      {chave ? "Regenerar" : "Gerar chave"}
                    </BotaoAcao>
                  </form>
                )}
                {chave && (
                  <Link
                    href={`/organizador/eventos/${evento.id}/chaves/${chave.id}`}
                    className="text-xs font-medium underline"
                  >
                    abrir
                  </Link>
                )}
              </div>
            </li>
          );
        })}
        {comInscritos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhuma categoria com inscrições confirmadas ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
