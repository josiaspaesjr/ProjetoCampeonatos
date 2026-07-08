import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos } from "@/db/schema";
import { PublicShell } from "@/components/public-shell";
import { getAtletaAtual } from "@/lib/sessao";
import { criarInscricao } from "./actions";
import { FormInscricao } from "./form-inscricao";

export default async function PaginaInscricao({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), eq(eventos.status, "publicado")),
  });
  if (!evento) notFound();

  const [cats, atleta] = await Promise.all([
    db.query.categorias.findMany({
      where: and(eq(categorias.eventoId, evento.id), eq(categorias.status, "aberta")),
      orderBy: asc(categorias.nome),
    }),
    getAtletaAtual(),
  ]);

  const acao = criarInscricao.bind(null, evento.slug);

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Inscrição — {evento.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Só mostramos categorias compatíveis com seu perfil. Pagamento na
          próxima etapa.
        </p>

        <FormInscricao
          dataEvento={evento.dataInicio}
          categorias={cats.map((c) => ({
            id: c.id,
            nome: c.nome,
            sexo: c.sexo,
            faixa: c.faixa,
            idadeMin: c.idadeMin,
            idadeMax: c.idadeMax,
          }))}
          acao={acao}
          perfil={
            atleta
              ? {
                  nome: atleta.nome,
                  email: atleta.email,
                  dataNascimento: atleta.dataNascimento ?? undefined,
                  sexo: atleta.sexo ?? undefined,
                  faixa: atleta.faixaAtual ?? undefined,
                }
              : undefined
          }
        />
      </div>
    </PublicShell>
  );
}
