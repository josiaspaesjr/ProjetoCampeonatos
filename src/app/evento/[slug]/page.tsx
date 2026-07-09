import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";
import { Logo, SkewTexto } from "@/components/marca";
import { dataCompleta, dataHora, diaMes } from "@/lib/datas";
import { secoesPreenchidas } from "@/lib/regulamento";
import { CategoriasFiltro } from "./categorias-filtro";

const MODALIDADE_ROTULO: Record<string, string> = {
  gi_nogi: "Gi + No-Gi",
  gi: "Gi",
  nogi: "No-Gi",
};

// abreviação de faixa para o fato "Faixas" (ex.: "Bca→Pta")
const FAIXA_ABREV: Record<string, string> = {
  branca: "Bca",
  cinza: "Cza",
  amarela: "Ama",
  laranja: "Lja",
  verde: "Vde",
  azul: "Azl",
  roxa: "Rxa",
  marrom: "Mrm",
  preta: "Pta",
};

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
  const [cats, todosLotes, confirmadas, areasDoEvento] = await Promise.all([
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
    db.query.areas.findMany({
      where: eq(areas.eventoId, evento.id),
      columns: { id: true },
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
      ? { rotulo: "Ao vivo agora", vivo: true }
      : inscricoesAbertas
        ? { rotulo: "Inscrições abertas", vivo: true }
        : evento.status === "finalizado"
          ? { rotulo: "Evento finalizado", vivo: false }
          : { rotulo: "Inscrições encerradas", vivo: false };

  const faixas =
    evento.faixaMin || evento.faixaMax
      ? `${FAIXA_ABREV[evento.faixaMin ?? "branca"]}→${FAIXA_ABREV[evento.faixaMax ?? "preta"]}`
      : "Bca→Pta";

  const regulamento = secoesPreenchidas(evento.regulamento);

  const fatos: { k: string; v: string; destaque?: boolean }[] = [
    { k: "Modalidade", v: MODALIDADE_ROTULO[evento.modalidade] ?? "Gi + No-Gi" },
    {
      k: "Áreas",
      v:
        areasDoEvento.length > 0
          ? String(areasDoEvento.length)
          : evento.numAreas
            ? String(evento.numAreas)
            : "—",
    },
    { k: "Faixas", v: faixas },
    evento.dataPesagem
      ? { k: "Pesagem", v: diaMes(evento.dataPesagem), destaque: true }
      : { k: "Data", v: diaMes(evento.dataInicio), destaque: true },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-7 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <Link
            href="/eventos"
            className="max-sm:hidden transition-colors hover:text-brand"
          >
            ← Todos os eventos
          </Link>
          <a
            href="#categorias"
            className="max-sm:hidden text-muted-2 transition-colors hover:text-brand"
          >
            Categorias
          </a>
          {inscricoesAbertas && (
            <Link
              href={`/evento/${evento.slug}/inscricao`}
              className="-skew-x-9 bg-brand px-[22px] py-2.5 text-white"
            >
              <SkewTexto>Inscrever-se</SkewTexto>
            </Link>
          )}
        </div>
      </nav>

      {/* HERO BANNER */}
      <header className="relative flex h-[clamp(440px,58vh,640px)] items-end overflow-hidden">
        <div className="absolute inset-0 bg-stripes-foto">
          {evento.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={evento.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,13,0.3)_0%,rgba(12,12,13,0.2)_40%,rgba(12,12,13,0.96)_100%)]" />
        <div className="pointer-events-none relative z-[2] w-full px-6 pb-10 md:px-12">
          <div className="mb-[18px] flex flex-wrap gap-2.5">
            <span className="inline-flex -skew-x-9 items-center bg-brand px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-white">
              <SkewTexto>
                {statusBadge.vivo && (
                  <span className="h-[7px] w-[7px] rounded-full bg-white animate-pulse-dot" />
                )}
                {statusBadge.rotulo}
              </SkewTexto>
            </span>
            {evento.circuito ? (
              <span className="border border-white/16 bg-ink/70 px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-text-2">
                {evento.circuito}
              </span>
            ) : (
              loteVigente && (
                <span className="border border-white/16 bg-ink/70 px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-text-2">
                  {loteVigente.nome}
                </span>
              )
            )}
          </div>
          <h1 className="disp max-w-[1000px] text-[clamp(56px,8vw,120px)]">
            {evento.nome}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-cond text-lg uppercase tracking-[0.05em] text-text-2">
            <span className="text-brand">◆</span>
            <span>{dataCompleta(evento.dataInicio)}</span>
            {evento.cidade && (
              <>
                <span className="text-brand">◆</span>
                <span>
                  {evento.cidade}
                  {evento.uf ? ` · ${evento.uf}` : ""}
                </span>
              </>
            )}
            {evento.endereco && (
              <>
                <span className="text-brand">◆</span>
                <span>{evento.endereco}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="grid items-start gap-12 px-6 pb-[90px] pt-[52px] md:px-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* MAIN */}
        <main className="flex flex-col gap-14">
          {/* SOBRE */}
          <section>
            <div className="mb-3 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
              Sobre o evento
            </div>
            {evento.descricao ? (
              <p className="max-w-[680px] whitespace-pre-line text-lg font-medium leading-relaxed text-text-2">
                {evento.descricao}
              </p>
            ) : (
              <p className="max-w-[680px] text-lg font-medium leading-relaxed text-muted-2">
                Campeonato de jiu-jitsu com inscrições, chaveamento e placar
                digital pela BJJArena.
              </p>
            )}
            <div className="mt-[30px] grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-4">
              {fatos.map((f) => (
                <div key={f.k} className="bg-background px-[22px] py-[22px]">
                  <div className="mb-2 font-cond text-[13px] uppercase tracking-[0.1em] text-muted-2">
                    {f.k}
                  </div>
                  <div
                    className={`disp text-[38px] ${f.destaque ? "text-brand" : ""}`}
                  >
                    {f.v}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* REGULAMENTO */}
          {regulamento.length > 0 && (
            <section>
              <div className="mb-5 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
                Regulamento
              </div>
              <div className="flex flex-col gap-px border border-white/10 bg-white/10">
                {regulamento.map((s) => (
                  <details
                    key={s.titulo}
                    className="group bg-background [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 select-none">
                      <span className="h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
                      <span className="flex-1 font-cond text-[19px] font-semibold uppercase tracking-[0.02em]">
                        {s.titulo}
                      </span>
                      <span className="font-cond text-xs text-muted-3 transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <p className="whitespace-pre-line border-t border-white/8 px-5 py-4 text-[15px] font-medium leading-relaxed text-text-2">
                      {s.texto}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* CATEGORIAS */}
          <section id="categorias" className="scroll-mt-24">
            <div className="mb-[18px] flex items-baseline gap-3">
              <h2 className="disp text-[54px]">Categorias</h2>
              <span className="font-cond text-[17px] uppercase tracking-[0.06em] text-muted-2">
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
        <aside className="top-24 flex flex-col gap-[18px] lg:sticky">
          {/* CARD DE INSCRIÇÃO */}
          <div className="relative overflow-hidden border border-brand/40 bg-surface p-[26px]">
            <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
            {inscricoesAbertas ? (
              <>
                <div className="mb-0.5 font-cond text-[13px] uppercase tracking-[0.1em] text-muted-2">
                  Inscrição · {loteVigente.nome}
                </div>
                <div className="mb-5 flex items-baseline gap-2">
                  <span className="disp text-[68px] leading-none text-brand">
                    {fmt.format(loteVigente.precoCentavos / 100)}
                  </span>
                  <span className="font-cond text-sm uppercase text-muted-2">
                    por categoria
                  </span>
                </div>
                <Link
                  href={`/evento/${evento.slug}/inscricao`}
                  className="mb-2.5 block bg-brand py-[15px] text-center font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
                >
                  Inscrever-se →
                </Link>
              </>
            ) : (
              <div className="mb-2.5 border border-white/14 p-4 text-center font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
                {statusBadge.rotulo}
              </div>
            )}
            <Link
              href={`/evento/${evento.slug}/cronograma`}
              className="block border border-white/16 py-3 text-center font-cond text-[15px] font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/30"
            >
              Cronograma ao vivo
            </Link>
            <div className="mt-[22px] flex flex-col gap-3 border-t border-white/8 pt-5">
              {evento.inscricoesFecham && (
                <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
                  <span className="text-muted-2">Inscrições fecham</span>
                  <span className="text-brand-soft">
                    {dataHora(evento.inscricoesFecham)}
                  </span>
                </div>
              )}
              {loteVigente?.precoSegundaInscricaoCentavos != null && (
                <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
                  <span className="text-muted-2">Segunda categoria</span>
                  <span className="text-text-2">
                    + {fmt.format(loteVigente.precoSegundaInscricaoCentavos / 100)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
                <span className="text-muted-2">Pagamento</span>
                <span className="text-text-2">
                  {evento.moeda === "BRL" ? "Pix" : "Cartão"}
                </span>
              </div>
            </div>
          </div>

          {/* EQUIPES */}
          <div className="border border-white/10 bg-surface p-6">
            <div className="mb-3.5 flex items-baseline gap-2.5">
              <span className="disp text-[30px]">Equipes</span>
              <span className="font-cond text-[13px] uppercase text-muted-2">
                {porAcademia.size} confirmada{porAcademia.size === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-col">
              {equipes.map(([nome, qtd]) => (
                <div
                  key={nome}
                  className="flex items-center justify-between border-t border-white/6 py-2.5"
                >
                  <span className="text-[15px] font-medium text-text-2">{nome}</span>
                  <span className="disp text-[26px] text-brand">{qtd}</span>
                </div>
              ))}
              {equipes.length === 0 && (
                <div className="border-t border-white/6 py-3 font-cond text-sm text-muted-3">
                  Seja o primeiro a se inscrever!
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/8 px-6 py-[34px] md:px-12">
        <span className="disp text-[26px]">
          BJJ<span className="text-brand">ARENA</span>
        </span>
        <span className="font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          © {new Date().getFullYear()} · Sistema de competições de jiu-jitsu
        </span>
      </footer>
    </div>
  );
}
