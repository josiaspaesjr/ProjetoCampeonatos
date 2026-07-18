import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { formatoAutomatico } from "@/lib/bracket";
import { SeletorFormato } from "@/components/chaves/seletor-formato";
import { gerarChave, gerarChavesEmLote, publicarChaves } from "../../actions";

const VARIANTE_CHAVE: Record<string, BadgeProps["variant"]> = {
  rascunho: "warning",
  publicada: "default",
  em_andamento: "outline",
  concluida: "success",
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
  const dic = await getDicionario();
  const ch = dic.admin.chaves;

  const evento = await eventoGerenciavel(db, id, usuario.id);
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
        <p className="max-w-[560px] text-sm text-muted-foreground">{ch.intro}</p>
        <div className="flex items-center gap-3">
          {semChave > 0 && (
            <form action={gerarChavesEmLote.bind(null, evento.id)}>
              <BotaoAcao>
                {ch.gerar} {semChave}{" "}
                {semChave === 1 ? ch.chaveSing : ch.chavePlur} {ch.emLote}
              </BotaoAcao>
            </form>
          )}
          {rascunhos > 0 && (
            <form action={publicarChaves.bind(null, evento.id)}>
              <BotaoAcao variant="success">
                {ch.publicar} {rascunhos}{" "}
                {rascunhos === 1 ? ch.chaveSing : ch.chavePlur}
              </BotaoAcao>
            </form>
          )}
        </div>
      </div>

      <ul className="mt-6 divide-y divide-border rounded-xl border bg-card">
        {comInscritos.map((c) => {
          const chave = chavePorCategoria.get(c.id);
          const qtd = contagem.get(c.id) ?? 0;
          const rotulo = chave ? (ch.status[chave.status] ?? chave.status) : ch.semChave;
          const variante: BadgeProps["variant"] = chave
            ? (VARIANTE_CHAVE[chave.status] ?? "secondary")
            : "secondary";

          return (
            <li
              key={c.id}
              className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {qtd} {qtd === 1 ? ch.confirmadoSing : ch.confirmadoPlur}
                  {qtd === 1 && ` — ${ch.insuficiente}`}
                  {chave
                    ? ` · ${ch.formatos[chave.formato]?.nome ?? chave.formato}`
                    : qtd >= 2 &&
                      ` · ${ch.formatoSugerido} ${ch.formatos[formatoAutomatico(qtd)].nome}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 max-sm:w-full">
                <Badge variant={variante}>{rotulo}</Badge>
                {qtd >= 2 && (!chave || chave.status === "rascunho") && (
                  <SeletorFormato
                    acao={gerarChave.bind(null, evento.id, c.id)}
                    qtd={qtd}
                    regenerar={!!chave}
                    formatoAtual={chave?.formato ?? null}
                  />
                )}
                {chave && (
                  <Link
                    href={`/organizador/eventos/${evento.id}/chaves/${chave.id}`}
                    className="text-xs font-medium underline"
                  >
                    {ch.abrir}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
        {comInscritos.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            {ch.nenhumaCategoriaConfirmada}
          </li>
        )}
      </ul>
    </div>
  );
}
