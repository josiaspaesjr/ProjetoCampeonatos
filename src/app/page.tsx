import Link from "next/link";
import { asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lotes, lutas } from "@/db/schema";
import { Eyebrow, Logo, PontoVivo } from "@/components/marca";
import { RankingTabs } from "@/components/ranking-tabs";
import { calcularRankingGeral } from "@/lib/ranking";
import { diaMesPartes } from "@/lib/datas";

// lista eventos publicados direto do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

const PASSOS = [
  {
    num: "01",
    titulo: "Crie seu perfil",
    desc: "Cadastro único com faixa, peso, equipe e histórico. Reutilizável em todas as etapas do circuito.",
  },
  {
    num: "02",
    titulo: "Inscreva-se",
    desc: "Escolha a categoria, confirme a pesagem e pague com Pix. Tudo validado automaticamente pelo sistema.",
  },
  {
    num: "03",
    titulo: "Acompanhe a chave",
    desc: "Chaveamento gerado ao vivo com notificação antes de cada luta e chamada de área em tempo real.",
  },
  {
    num: "04",
    titulo: "Suba no ranking",
    desc: "Cada resultado alimenta o ranking do circuito por faixa, idade e peso, atualizado na hora.",
  },
];

const MARQUEE = [
  "Gi & No-Gi",
  "Chaveamento ao vivo",
  "Inscrições com Pix",
  "Placar digital certificado",
];

interface LadoBracket {
  nome: string;
  placar: string;
  venceu: boolean;
}

interface BracketVivo {
  demo: boolean;
  titulo: string;
  area: string;
  esquerda: LadoBracket[];
  direita: LadoBracket[];
  href: string;
}

const BRACKET_DEMO: BracketVivo = {
  demo: true,
  titulo: "Adulto · Faixa-Preta · -76kg",
  area: "Demonstração",
  esquerda: [
    { nome: "R. Mendes", placar: "6", venceu: true },
    { nome: "L. Costa", placar: "2", venceu: false },
  ],
  direita: [
    { nome: "T. Almeida", placar: "4", venceu: false },
    { nome: "B. Rocha", placar: "11", venceu: true },
  ],
  href: "#eventos",
};

async function buscarBracketVivo(): Promise<BracketVivo> {
  const db = await getDb();
  const emAndamento = await db.query.chaves.findFirst({
    where: eq(chaves.status, "em_andamento"),
  });
  if (!emAndamento) return BRACKET_DEMO;

  const [cat, linhas] = await Promise.all([
    db.query.categorias.findFirst({
      where: eq(categorias.id, emAndamento.categoriaId),
    }),
    db.query.lutas.findMany({ where: eq(lutas.chaveId, emAndamento.id) }),
  ]);
  if (!cat || linhas.length === 0) return BRACKET_DEMO;

  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, cat.eventoId),
  });

  // duas lutas mais recentes com os dois atletas definidos
  const candidatas = linhas
    .filter((l) => l.atleta1InscricaoId && l.atleta2InscricaoId)
    .sort((a, b) => b.rodada - a.rodada || a.posicao - b.posicao)
    .slice(0, 2);
  if (candidatas.length < 2) return BRACKET_DEMO;

  const ids = candidatas.flatMap((l) => [
    l.atleta1InscricaoId!,
    l.atleta2InscricaoId!,
  ]);
  const atletas = await db.query.inscricoes.findMany({
    where: inArray(inscricoes.id, ids),
  });
  const nomePorId = new Map(atletas.map((a) => [a.id, a.nomeAtleta]));
  const abreviar = (nome: string) => {
    const partes = nome.trim().split(/\s+/);
    return partes.length > 1
      ? `${partes[0][0]}. ${partes[partes.length - 1]}`
      : nome;
  };

  const lado = (l: (typeof candidatas)[number]): LadoBracket[] => [
    {
      nome: abreviar(nomePorId.get(l.atleta1InscricaoId!) ?? "Atleta"),
      placar: String(l.pontos1),
      venceu: l.vencedorInscricaoId === l.atleta1InscricaoId,
    },
    {
      nome: abreviar(nomePorId.get(l.atleta2InscricaoId!) ?? "Atleta"),
      placar: String(l.pontos2),
      venceu: l.vencedorInscricaoId === l.atleta2InscricaoId,
    },
  ];

  return {
    demo: false,
    titulo: cat.nome,
    area: "Ao vivo",
    esquerda: lado(candidatas[0]),
    direita: lado(candidatas[1]),
    href: evento ? `/evento/${evento.slug}/chaves/${cat.id}` : "#eventos",
  };
}

export default async function Home() {
  const db = await getDb();

  const [publicados, todosEventos, confirmadas, ranking, bracket] =
    await Promise.all([
      db.query.eventos.findMany({
        where: inArray(eventos.status, ["publicado", "em_andamento"]),
        orderBy: asc(eventos.dataInicio),
      }),
      db.query.eventos.findMany({ where: ne(eventos.status, "rascunho") }),
      db.query.inscricoes.findMany({
        where: eq(inscricoes.status, "confirmada"),
      }),
      calcularRankingGeral(db),
      buscarBracketVivo(),
    ]);

  const todosLotes = publicados.length
    ? await db.query.lotes.findMany({
        where: inArray(lotes.eventoId, publicados.map((e) => e.id)),
        orderBy: asc(lotes.inicio),
      })
    : [];

  const agora = new Date();
  const fmtBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  const cards = publicados.map((e) => {
    const lotesDoEvento = todosLotes.filter((l) => l.eventoId === e.id);
    const vigente = lotesDoEvento.find((l) => l.inicio <= agora && agora <= l.fim);
    const abertas =
      e.status === "publicado" &&
      !!vigente &&
      (!e.inscricoesFecham || agora <= e.inscricoesFecham);
    const futuro =
      e.status === "publicado" &&
      !vigente &&
      (lotesDoEvento.some((l) => l.inicio > agora) ||
        (e.inscricoesAbrem && e.inscricoesAbrem > agora));

    const status =
      e.status === "em_andamento"
        ? { rotulo: "Ao vivo agora", classe: "text-live" }
        : abertas
          ? { rotulo: "Inscrições abertas", classe: "text-gold" }
          : futuro
            ? { rotulo: "Em breve", classe: "text-muted-2" }
            : { rotulo: "Inscrições encerradas", classe: "text-muted-2" };

    const inscritos = confirmadas.filter((i) => i.eventoId === e.id).length;

    return { evento: e, vigente, abertas, status, inscritos };
  });

  const totalAtletas = new Set(confirmadas.map((i) => i.usuarioId)).size;
  const totalEquipes = new Set(
    confirmadas.map((i) => i.academiaNome).filter(Boolean),
  ).size;
  const stats = [
    { rotulo: "Eventos", valor: String(todosEventos.length), destaque: false },
    { rotulo: "Atletas", valor: String(totalAtletas), destaque: false },
    { rotulo: "Equipes", valor: String(totalEquipes), destaque: true },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/7 bg-ink/80 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="hidden items-center gap-9 text-[13px] font-medium uppercase tracking-[0.1em] md:flex">
          <a href="#formato" className="text-muted-2 transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#chaveamento" className="text-muted-2 transition-colors hover:text-foreground">
            Ao vivo
          </a>
          <a href="#ranking" className="text-muted-2 transition-colors hover:text-foreground">
            Ranking
          </a>
          <a href="#eventos" className="text-muted-2 transition-colors hover:text-foreground">
            Eventos
          </a>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/minhas-inscricoes"
            className="hidden font-mono text-xs uppercase tracking-[0.1em] text-muted-2 transition-colors hover:text-foreground sm:block"
          >
            Minhas inscrições
          </Link>
          <Link
            href="/organizador"
            className="inline-flex items-center bg-gold px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-gold-light"
          >
            Criar meu evento
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative flex min-h-[88vh] flex-col justify-end overflow-hidden px-6 pb-14 pt-16 md:px-12">
        <div className="absolute inset-0 bg-stripes-hero" />
        <div className="absolute inset-0 glow-gold-tr" />
        <div
          className="absolute right-[6%] top-[38%] hidden font-display text-xs font-extrabold uppercase tracking-[0.3em] text-gold/50 lg:block"
          style={{ writingMode: "vertical-rl" }}
        >
          Plataforma de competições · JJ
        </div>

        <div className="relative z-[2] max-w-[1040px]">
          <div className="mb-6 inline-flex items-center gap-2.5 border border-gold/40 px-3.5 py-[7px] font-mono text-[11px] uppercase tracking-[0.16em] text-gold-light">
            <PontoVivo />O sistema operacional do jiu-jitsu competitivo
          </div>
          <h1 className="font-display text-[clamp(52px,8.4vw,124px)] font-extrabold uppercase leading-[0.9] tracking-[-0.01em]">
            Toda competição,
            <br />
            <span className="text-gold">uma plataforma</span>
          </h1>
          <div className="mt-9 flex flex-wrap items-end gap-10">
            <p className="max-w-[480px] text-[17px] leading-normal text-muted-2">
              Inscrições com Pix, pesagem, chaveamento ao vivo, placar digital e
              ranking do circuito — a BJJArena dá às federações e academias tudo
              para rodar um campeonato de ponta a ponta, sem planilha nenhuma.
            </p>
            <div className="flex gap-9 font-mono">
              {stats.map((s) => (
                <div key={s.rotulo}>
                  <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-2">
                    {s.rotulo}
                  </div>
                  <div
                    className={`font-display text-[26px] font-bold ${s.destaque ? "text-gold" : ""}`}
                  >
                    {s.valor}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/organizador"
              className="bg-gold px-8 py-[15px] font-display text-base font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-gold-light"
            >
              Criar meu evento
            </Link>
            <a
              href="#eventos"
              className="border border-white/20 px-8 py-[15px] font-display text-base font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:border-white/40"
            >
              Ver eventos
            </a>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="overflow-hidden border-y bg-surface py-3.5">
        <div className="flex w-max animate-marquee font-display text-base font-bold uppercase tracking-[0.18em] text-muted-3">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex" aria-hidden={copia === 1}>
              {MARQUEE.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="px-[26px]">{item}</span>
                  <span className="text-gold">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* EVENTOS */}
      <section id="eventos" className="px-6 py-24 md:px-12">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow className="mb-3">{"// Rodando na plataforma"}</Eyebrow>
            <h2 className="font-display text-[clamp(38px,5.5vw,68px)] font-extrabold uppercase leading-[0.95]">
              Eventos na
              <br />
              plataforma
            </h2>
          </div>
          <p className="max-w-[320px] text-[15px] text-muted-2">
            Cada organização publica suas etapas na BJJArena. Página, inscrições
            e chaveamento gerados automaticamente pelo sistema.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="border border-dashed border-white/16 p-10 font-mono text-sm text-muted-3">
            Nenhum evento publicado no momento — o próximo campeonato aparece
            aqui.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-5">
            {cards.map(({ evento: e, vigente, abertas, status, inscritos }) => {
              const data = diaMesPartes(e.dataInicio);
              return (
                <Link
                  key={e.id}
                  href={`/evento/${e.slug}`}
                  className="group flex flex-col border border-white/9 bg-raised transition-colors hover:border-gold/55"
                >
                  <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-stripes-foto">
                    {e.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.bannerUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[11px] tracking-[0.1em] text-[#4A473F]">
                        [ foto do evento ]
                      </span>
                    )}
                    <div
                      className={`absolute left-3 top-3 flex items-center gap-2 border border-white/12 bg-ink px-2.5 py-[5px] font-mono text-[10px] uppercase tracking-[0.12em] ${status.classe}`}
                    >
                      {status.rotulo}
                    </div>
                    <div className="absolute bottom-3 right-3 text-right font-display text-[34px] font-extrabold leading-none text-white/90">
                      {data.dia}
                      <span className="block text-xs tracking-[0.2em] text-gold">
                        {data.mes}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3.5 p-5 pb-[22px]">
                    <div className="font-display text-2xl font-bold uppercase leading-[1.05]">
                      {e.nome}
                    </div>
                    <div className="flex gap-4 font-mono text-[11px] tracking-[0.06em] text-muted-2">
                      <span>
                        {e.cidade ? `${e.cidade} · ${e.uf ?? ""}` : "Local a definir"}
                      </span>
                      {vigente && (
                        <>
                          <span className="text-[#3A3833]">/</span>
                          <span className="text-gold-light">
                            {fmtBRL.format(vigente.precoCentavos / 100)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-white/7 pt-3.5">
                      <span className="font-mono text-xs text-muted-2">
                        {inscritos > 0
                          ? `${inscritos} atleta${inscritos === 1 ? "" : "s"} confirmado${inscritos === 1 ? "" : "s"}`
                          : "Seja o primeiro a se inscrever"}
                      </span>
                      <span className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-gold">
                        {abertas ? "Inscrever →" : "Ver evento →"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* FORMATO */}
      <section id="formato" className="border-y bg-surface px-6 py-[88px] md:px-12">
        <Eyebrow className="mb-3">{"// Como funciona"}</Eyebrow>
        <h2 className="mb-14 max-w-[800px] font-display text-[clamp(38px,5.5vw,68px)] font-extrabold uppercase leading-[0.95]">
          Da inscrição ao pódio, em uma plataforma só
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-px border border-white/8 bg-white/8">
          {PASSOS.map((p) => (
            <div
              key={p.num}
              className="flex min-h-[230px] flex-col gap-4 bg-surface p-7 py-[34px]"
            >
              <div className="font-mono text-[13px] text-gold">{p.num}</div>
              <div className="font-display text-[26px] font-bold uppercase leading-none">
                {p.titulo}
              </div>
              <div className="text-[15px] leading-normal text-muted-2">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CHAVEAMENTO AO VIVO */}
      <section id="chaveamento" className="px-6 py-24 md:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="mb-[18px] inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-gold-light">
              <PontoVivo cor={bracket.demo ? "bg-gold" : "bg-live"} />
              {bracket.demo ? "Como você acompanha" : "Ao vivo agora"}
            </div>
            <h2 className="mb-[22px] font-display text-[clamp(38px,5vw,64px)] font-extrabold uppercase leading-[0.95]">
              Chaveamento e resultados em tempo real
            </h2>
            <p className="mb-[30px] max-w-[440px] text-[17px] leading-relaxed text-muted-2">
              Acompanhe cada chave, atualizações de placar e chamadas de área ao
              vivo. Atletas e treinadores veem o cronograma estimado antes de
              cada luta.
            </p>
            <Link
              href={bracket.href}
              className="inline-flex border border-gold px-[30px] py-3.5 font-display text-[15px] font-bold uppercase tracking-[0.08em] text-gold transition-colors hover:text-gold-light"
            >
              Abrir chaveamento
            </Link>
          </div>

          <div className="border border-white/10 bg-raised p-6">
            <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
              <span>{bracket.titulo}</span>
              <span className={bracket.demo ? "text-muted-3" : "text-live"}>
                ● {bracket.area}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2 max-sm:grid-cols-1">
              <div className="flex flex-col gap-2">
                {bracket.esquerda.map((m) => (
                  <div
                    key={m.nome}
                    className={`flex items-center justify-between border bg-hover-row px-3.5 py-3 ${m.venceu ? "border-gold/60" : "border-white/8"}`}
                  >
                    <span
                      className={`font-display text-base font-semibold ${m.venceu ? "text-foreground" : "text-muted-2"}`}
                    >
                      {m.nome}
                    </span>
                    <span className="font-mono text-[13px] text-gold">{m.placar}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center font-display text-sm font-extrabold text-muted-3 max-sm:py-1">
                VS
              </div>
              <div className="flex flex-col gap-2">
                {bracket.direita.map((m) => (
                  <div
                    key={m.nome}
                    className={`flex items-center justify-between border bg-hover-row px-3.5 py-3 ${m.venceu ? "border-gold/60" : "border-white/8"}`}
                  >
                    <span className="font-mono text-[13px] text-gold">{m.placar}</span>
                    <span
                      className={`font-display text-base font-semibold ${m.venceu ? "text-foreground" : "text-muted-2"}`}
                    >
                      {m.nome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-between border-t border-white/7 pt-4 font-mono text-[11px] text-muted-2">
              <span>
                {bracket.demo ? "Exemplo de chave em disputa" : "Chave em disputa"}
              </span>
              <span className="text-gold-light">semifinais</span>
            </div>
          </div>
        </div>
      </section>

      {/* RANKING */}
      <section id="ranking" className="border-t bg-surface px-6 py-[88px] md:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow className="mb-3">{"// Ranking do circuito"}</Eyebrow>
            <h2 className="font-display text-[clamp(38px,5.5vw,68px)] font-extrabold uppercase leading-[0.95]">
              Os melhores do circuito
            </h2>
          </div>
        </div>
        <RankingTabs dados={ranking} />
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-[120px] md:px-12">
        <div className="absolute inset-0 bg-stripes-hero" />
        <div className="absolute inset-0 glow-gold-b" />
        <div className="relative z-[2] mx-auto max-w-[820px] text-center">
          <div className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-gold">
            Comece a rodar seus eventos hoje
          </div>
          <h2 className="mb-7 font-display text-[clamp(46px,8vw,104px)] font-extrabold uppercase leading-[0.9]">
            O tatame,
            <br />
            <span className="text-gold">organizado</span>
          </h2>
          <p className="mx-auto mb-10 max-w-[540px] text-lg leading-normal text-muted-2">
            Organizadores montam um campeonato completo em minutos. Atletas se
            inscrevem em qualquer etapa com dois cliques. Tudo em um sistema só.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/organizador"
              className="bg-gold px-[42px] py-[17px] font-display text-[17px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-gold-light"
            >
              Criar meu evento
            </Link>
            <a
              href="#eventos"
              className="border border-white/25 px-[42px] py-[17px] font-display text-[17px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:border-white/45"
            >
              Sou atleta
            </a>
          </div>
        </div>
      </section>

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
