import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { academias, categorias, eventos, lotes } from "@/db/schema";
import { Logo } from "@/components/marca";
import { dataCurta } from "@/lib/datas";
import { getAtletaAtual } from "@/lib/sessao";
import { getDicionario } from "@/lib/i18n/server";
import { ordenarCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import { criarInscricao } from "./actions";
import { FormInscricao } from "./form-inscricao";

export default async function PaginaInscricao({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const di = (await getDicionario()).inscricao;

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), eq(eventos.status, "publicado")),
  });
  if (!evento) notFound();

  const agora = new Date();
  const [catsRaw, todosLotes, atleta] = await Promise.all([
    db.query.categorias.findMany({
      where: and(eq(categorias.eventoId, evento.id), eq(categorias.status, "aberta")),
      orderBy: asc(categorias.nome),
    }),
    db.query.lotes.findMany({
      where: eq(lotes.eventoId, evento.id),
      orderBy: asc(lotes.inicio),
    }),
    getAtletaAtual(),
  ]);
  // ordem canônica de exibição: classe → sexo (feminino primeiro) → faixa → peso
  const cats = ordenarCategoriasExibicao(catsRaw);

  // academia atual do atleta logado, para pré-selecionar no formulário
  const academiaAtleta = atleta?.academiaId
    ? await db.query.academias.findFirst({
        where: eq(academias.id, atleta.academiaId),
        columns: { nome: true },
      })
    : null;

  const loteVigente = todosLotes.find((l) => l.inicio <= agora && agora <= l.fim);
  const inscricoesAbertas =
    !!loteVigente && (!evento.inscricoesFecham || agora <= evento.inscricoesFecham);

  const acao = criarInscricao.bind(null, evento.slug);
  const local = evento.endereco ?? (evento.cidade ? `${evento.cidade}/${evento.uf ?? ""}` : "");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* NAV */}
      <nav className="flex items-center justify-between border-b border-white/7 px-6 py-4 md:px-12">
        <Logo />
        <Link
          href={`/evento/${evento.slug}`}
          className="font-cond text-xs uppercase tracking-[0.1em] text-muted-2 transition-colors hover:text-foreground"
        >
          ← {di.voltarAoEvento}
        </Link>
      </nav>

      {inscricoesAbertas ? (
        <FormInscricao
          dataEvento={evento.dataInicio}
          categorias={cats.map((c) => ({
            id: c.id,
            nome: c.nome,
            sexo: c.sexo,
            faixa: c.faixa,
            idadeMin: c.idadeMin,
            idadeMax: c.idadeMax,
            precoCentavos: c.precoCentavos,
            grupoPreco: c.grupoPreco,
          }))}
          evento={{
            nome: evento.nome,
            slug: evento.slug,
            meta: [dataCurta(evento.dataInicio), local].filter(Boolean).join(" · "),
            badge: loteVigente.nome,
            bannerUrl: evento.bannerUrl,
            precoCentavos: loteVigente.precoCentavos,
            precoSegundaCentavos: loteVigente.precoSegundaInscricaoCentavos,
            variacoes: loteVigente.variacoes,
            moeda: evento.moeda,
          }}
          acao={acao}
          perfil={
            atleta
              ? {
                  nome: atleta.nome,
                  email: atleta.email,
                  dataNascimento: atleta.dataNascimento ?? undefined,
                  sexo: atleta.sexo ?? undefined,
                  faixa: atleta.faixaAtual ?? undefined,
                  academiaId: atleta.academiaId ?? undefined,
                  academiaNome: academiaAtleta?.nome ?? undefined,
                  cpf: atleta.cpf ?? undefined,
                  cep: atleta.enderecoCep ?? undefined,
                  logradouro: atleta.enderecoLogradouro ?? undefined,
                  numero: atleta.enderecoNumero ?? undefined,
                  complemento: atleta.enderecoComplemento ?? undefined,
                  bairro: atleta.enderecoBairro ?? undefined,
                  cidade: atleta.enderecoCidade ?? undefined,
                  uf: atleta.enderecoUf ?? undefined,
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
          <div className="font-cond text-xs uppercase tracking-[0.2em] text-muted-2">
            {`// ${di.encerradasTag}`}
          </div>
          <h1 className="max-w-[700px] disp text-[clamp(34px,4.6vw,54px)] font-extrabold uppercase leading-[0.95]">
            {evento.nome}
          </h1>
          <p className="max-w-[480px] text-base text-muted-2">{di.encerradasMsg}</p>
          <Link
            href={`/evento/${evento.slug}`}
            className="border border-white/20 px-[30px] py-[15px] disp text-[15px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:border-white/40"
          >
            {di.voltarAoEvento}
          </Link>
        </div>
      )}
    </div>
  );
}
