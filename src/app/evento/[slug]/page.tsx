import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";
import { Eyebrow, Logo, PontoVivo } from "@/components/marca";
import { dataCompleta, dataHora, diaMes } from "@/lib/datas";
import { CategoriasFiltro } from "./categorias-filtro";

export default async function PaginaPublicaEvento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.slug, slug), ne(eventos.status, "rascunho")),
  });
  if (!evento) notFound();

  const agora = new Date();
  const [cats, todosLotes, confirmadas] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, evento.id),
      orderBy: asc(categorias.nome),
    }),
    db.query.lotes.findMany({
      where: eq(lotes.eventoId, evento.id),
      orderBy: asc(lotes.inicio),
    }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, evento.id), eq(inscricoes.status, "confirmada")),
    }),
  ]);

  const chavesPublicadas = cats.length
    ? (
        await db.query.chaves.findMany({
          where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
        })
      ).filter((c) => c.status !== "rascunho")
    : [];
  const chavePorCategoria = new Map(chavesPublicadas.map((c) => [c.categoriaId, c]));

  const loteVigente = todosLotes.find((l) => l.inicio <= agora && agora <= l.fim);
  const inscricoesAbertas =
    evento.status === "publicado" &&
    !!loteVigente &&
    (!evento.inscricoesFecham || agora <= evento.inscricoesFecham);

  const porCategoria = new Map<string, number>();
  for (const i of confirmadas) {
    porCategoria.set(i.categoriaId, (porCategoria.get(i.categoriaId) ?? 0) + 1);
  }

  const porAcademia = new Map<string, number>();
  for (const i of confirmadas) {
    const nome = i.academiaNome ?? "Sem equipe";
    porAcademia.set(nome, (porAcademia.get(nome) ?? 0) + 1);
  }
  const equipes = [...porAcademia.entries()].sort((a, b) => b[1] - a[1]);

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });

  const statusBadge =
    evento.status === "em_andamento"
      ? { rotulo: "Ao vivo agora", cor: "bg-live", texto: "text-gold-light" }
      : inscricoesAbertas
        ? { rotulo: "Inscrições abertas", cor: "bg-gold", texto: "text-gold-light" }
        : evento.status === "finalizado"
          ? { rotulo: "Evento finalizado", cor: "bg-muted-3", texto: "text-muted-2" }
          : { rotulo: "Inscrições encerradas", cor: "bg-muted-3", texto: "text-muted-2" };

  const fatos: { k: string; v: string; destaque?: boolean }[] = [
    { k: "Categorias", v: String(cats.length) },
    { k: "Atletas confirmados", v: String(confirmadas.length) },
    { k: "Equipes", v: String(porAcademia.size) },
    evento.inscricoesFecham
      ? { k: "Inscrições até", v: dataHora(evento.inscricoesFecham), destaque: true }
      : { k: "Data", v: diaMes(evento.dataInicio), destaque: true },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/7 bg-ink/80 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-6">
          <a
            href="#categorias"
            className="hidden font-mono text-xs uppercase tracking-[0.1em] text-muted-2 transition-colors hover:text-foreground sm:block"
          >
            Categorias
          </a>
          {inscricoesAbertas && (
            <Link
              href={`/evento/${evento.slug}/inscricao`}
              className="inline-flex bg-gold px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-gold-light"
            >
              Inscrever-se
            </Link>
          )}
        </div>
      </nav>

      {/* HERO BANNER */}
      <header className="relative flex h-[clamp(420px,56vh,620px)] items-end">
        <div className="absolute inset-0 overflow-hidden bg-stripes-foto">
          {evento.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={evento.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-[11px] tracking-[0.1em] text-[#4A473F]">
              [ imagem do evento ]
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,11,12,0.35) 0%, rgba(11,11,12,0.2) 45%, rgba(11,11,12,0.94) 100%)",
          }}
        />
        <div className="pointer-events-none relative z-[2] w-full px-6 pb-11 md:px-12">
          <div className="mb-5 flex flex-wrap gap-2.5">
            <span
              className={`inline-flex items-center gap-2 border border-gold/45 bg-ink/70 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${statusBadge.texto}`}
            >
              <PontoVivo cor={statusBadge.cor} />
              {statusBadge.rotulo}
            </span>
            {loteVigente && (
              <span className="border border-white/14 bg-ink/70 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
                {loteVigente.nome}
              </span>
            )}
          </div>
          <h1 className="max-w-[900px] font-display text-[clamp(44px,7vw,92px)] font-extrabold uppercase leading-[0.9]">
            {evento.nome}
          </h1>
          <div className="mt-[22px] flex flex-wrap gap-7 font-mono text-[13px] tracking-[0.04em] text-text-2">
            <span>◆ {dataCompleta(evento.dataInicio)}</span>
            {evento.cidade && (
              <span>
                ◆ {evento.cidade}
                {evento.uf ? ` · ${evento.uf}` : ""}
              </span>
            )}
            {evento.endereco && <span>◆ {evento.endereco}</span>}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="grid items-start gap-12 px-6 pb-24 pt-14 md:px-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* MAIN */}
        <main className="flex flex-col gap-14">
          {/* SOBRE */}
          <section>
            <Eyebrow className="mb-4">{"// Sobre o evento"}</Eyebrow>
            {evento.descricao ? (
              <p className="max-w-[660px] whitespace-pre-line text-lg leading-relaxed text-text-3">
                {evento.descricao}
              </p>
            ) : (
              <p className="max-w-[660px] text-lg leading-relaxed text-muted-2">
                Campeonato de jiu-jitsu com inscrições, chaveamento e placar
                digital pela BJJArena.
              </p>
            )}
            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-px border border-white/8 bg-white/8">
              {fatos.map((f) => (
                <div key={f.k} className="bg-surface px-5 py-[22px]">
                  <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
                    {f.k}
                  </div>
                  <div
                    className={`font-display text-2xl font-bold ${f.destaque ? "text-gold" : ""}`}
                  >
                    {f.v}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CATEGORIAS */}
          <section id="categorias" className="scroll-mt-24">
            <div className="mb-5 flex items-baseline gap-3.5">
              <h2 className="font-display text-4xl font-extrabold uppercase leading-none">
                Categorias
              </h2>
              <span className="font-mono text-sm text-muted-2">
                {cats.length} disponíve{cats.length === 1 ? "l" : "is"}
              </span>
            </div>
            <CategoriasFiltro
              categorias={cats.map((c) => ({
                id: c.id,
                nome: c.nome,
                faixa: c.faixa,
                classeIdade: c.classeIdade,
                sexo: c.sexo,
                inscritos: porCategoria.get(c.id) ?? 0,
                chaveUrl: chavePorCategoria.has(c.id)
                  ? `/evento/${evento.slug}/chaves/${c.id}`
                  : null,
                preco:
                  c.precoCentavos != null ? fmt.format(c.precoCentavos / 100) : null,
              }))}
            />
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="top-24 flex flex-col gap-5 lg:sticky">
          {/* CARD DE INSCRIÇÃO */}
          <div className="border border-gold/40 bg-panel-gold p-7">
            {inscricoesAbertas ? (
              <>
                <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  Inscrição · {loteVigente.nome}
                </div>
                <div className="mb-5 flex items-baseline gap-2">
                  <span className="font-display text-[52px] font-extrabold leading-none text-gold">
                    {fmt.format(loteVigente.precoCentavos / 100)}
                  </span>
                  <span className="font-mono text-xs text-muted-2">
                    por categoria
                  </span>
                </div>
                <Link
                  href={`/evento/${evento.slug}/inscricao`}
                  className="mb-3 block bg-gold p-4 text-center font-display text-[17px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-gold-light"
                >
                  Inscrever-se →
                </Link>
              </>
            ) : (
              <div className="mb-3 border border-white/14 p-4 text-center font-mono text-xs uppercase tracking-[0.12em] text-muted-2">
                {statusBadge.rotulo}
              </div>
            )}
            <Link
              href={`/evento/${evento.slug}/cronograma`}
              className="block border border-white/16 p-[13px] text-center font-display text-sm font-bold uppercase tracking-[0.06em] text-gold-light transition-colors hover:border-white/30"
            >
              Cronograma ao vivo
            </Link>
            <div className="mt-[22px] flex flex-col gap-3 border-t border-white/8 pt-5">
              {evento.inscricoesFecham && (
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-muted-2">Inscrições fecham</span>
                  <span className="text-gold-light">
                    {dataHora(evento.inscricoesFecham)}
                  </span>
                </div>
              )}
              {loteVigente?.precoSegundaInscricaoCentavos != null && (
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-muted-2">Segunda categoria</span>
                  <span className="text-text-2">
                    + {fmt.format(loteVigente.precoSegundaInscricaoCentavos / 100)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-2">Pagamento</span>
                <span className="text-text-2">
                  {evento.moeda === "BRL" ? "Pix" : "Cartão"}
                </span>
              </div>
            </div>
          </div>

          {/* EQUIPES */}
          <div className="border border-white/9 bg-surface p-6">
            <div className="mb-4 flex items-baseline gap-2.5">
              <span className="font-display text-xl font-bold uppercase">
                Equipes
              </span>
              <span className="font-mono text-xs text-muted-2">
                {porAcademia.size} confirmada{porAcademia.size === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-col">
              {equipes.map(([nome, qtd]) => (
                <div
                  key={nome}
                  className="flex items-center justify-between border-t border-white/6 py-[11px]"
                >
                  <span className="text-[15px] text-text-2">{nome}</span>
                  <span className="font-mono text-[13px] text-gold">{qtd}</span>
                </div>
              ))}
              {equipes.length === 0 && (
                <div className="border-t border-white/6 py-3 font-mono text-xs text-muted-3">
                  Seja o primeiro a se inscrever!
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/8 p-12 max-md:p-6">
        <Logo tamanho={26} />
        <div className="font-mono text-[11px] tracking-[0.08em] text-muted-3">
          © 2026 BJJArena · Sistema de competições de jiu-jitsu
        </div>
      </footer>
    </div>
  );
}
