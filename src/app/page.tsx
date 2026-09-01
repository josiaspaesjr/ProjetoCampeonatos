import Link from "next/link";
import { asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes, lotes } from "@/db/schema";
import { Logo, SkewTexto } from "@/components/marca";
import { AvisoPendencias } from "@/components/aviso-pendencias";
import { MenuUsuarioServer } from "@/components/menu-usuario-server";
import { buscarBracketVivo } from "@/lib/bracket-vivo";
import { dataCurta, diaMesPartes } from "@/lib/datas";
import { calcularRankingGeral } from "@/lib/ranking";
import { getDicionario } from "@/lib/i18n/server";
import { SeletorIdioma } from "@/lib/i18n/client";
import { CatalogoClient, type CardEvento } from "./catalogo-client";
import { VitrineClient } from "./vitrine-client";

// catálogo, stats e chave ao vivo vêm do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const dic = await getDicionario();
  const dc = dic.catalogo;
  const modalidades = dic.evento.modalidades as Record<string, string>;

  const publicos = await db.query.eventos.findMany({
    where: inArray(eventos.status, [
      "publicado",
      "inscricoes_encerradas",
      "em_andamento",
      "finalizado",
    ]),
    orderBy: asc(eventos.dataInicio),
  });

  const [todosLotes, confirmadas, todosEventos, ranking, bracket] =
    await Promise.all([
      publicos.length
        ? db.query.lotes.findMany({
            where: inArray(lotes.eventoId, publicos.map((e) => e.id)),
            orderBy: asc(lotes.inicio),
          })
        : Promise.resolve([]),
      db.query.inscricoes.findMany({
        where: eq(inscricoes.status, "confirmada"),
      }),
      db.query.eventos.findMany({ where: ne(eventos.status, "rascunho") }),
      calcularRankingGeral(db),
      buscarBracketVivo(),
    ]);

  const agora = new Date();
  const anoAtual = agora.getFullYear();

  const cards: CardEvento[] = publicos.map((e) => {
    const lotesDoEvento = todosLotes.filter((l) => l.eventoId === e.id);
    const vigente = lotesDoEvento.find(
      (l) => l.inicio <= agora && agora <= l.fim,
    );
    const aberto =
      e.status === "publicado" &&
      !!vigente &&
      (!e.inscricoesFecham || agora <= e.inscricoesFecham);
    const emBreve =
      e.status === "publicado" &&
      !vigente &&
      (lotesDoEvento.some((l) => l.inicio > agora) ||
        !!(e.inscricoesAbrem && e.inscricoesAbrem > agora));
    const aoVivo = e.status === "em_andamento";

    const statusChave = aoVivo
      ? "aoVivo"
      : aberto
        ? "inscricoesAbertas"
        : emBreve
          ? "emBreve"
          : e.status === "finalizado"
            ? "finalizado"
            : "encerradas";
    const status = dc.status[statusChave];

    const { dia, mes } = diaMesPartes(e.dataInicio);
    const ano = new Date(`${e.dataInicio}T12:00:00`).getFullYear();
    const local = e.cidade
      ? `${e.cidade}${e.uf ? `/${e.uf}` : ""}`
      : dc.localADefinir;

    return {
      slug: e.slug,
      nome: e.nome,
      descricao: e.descricao,
      bannerUrl: e.bannerUrl,
      dia,
      mesAno: `${mes} ${ano}`,
      dataLonga: dataCurta(e.dataInicio),
      cidade: local,
      meta: `${local} · ${modalidades[e.modalidade] ?? modalidades.gi_nogi}`,
      modalidade: e.modalidade,
      status,
      aberto,
      aoVivo,
      emBreve,
      inscritos: confirmadas.filter((i) => i.eventoId === e.id).length,
    };
  });

  const totalAtletas = new Set(confirmadas.map((i) => i.usuarioId)).size;
  const totalEquipes = new Set(
    confirmadas.map((i) => i.academiaNome).filter(Boolean),
  ).size;

  const stats = [
    { valor: String(todosEventos.length), destaque: false },
    { valor: String(totalAtletas), destaque: false },
    { valor: String(totalEquipes), destaque: true },
    { valor: String(confirmadas.length), destaque: false },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <AvisoPendencias />

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-6 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <a href="#aovivo" className="max-md:hidden transition-colors hover:text-brand">
            {dc.aoVivo}
          </a>
          <a href="#ranking" className="max-md:hidden transition-colors hover:text-brand">
            {dc.ranking}
          </a>
          <Link
            href="/plataforma"
            className="max-sm:hidden transition-colors hover:text-brand"
          >
            {dic.nav.plataforma}
          </Link>
          <SeletorIdioma className="max-sm:hidden" />
          <Link
            href="/organizador"
            className="max-sm:hidden -skew-x-9 bg-brand px-5 py-2.5 text-white"
          >
            <SkewTexto>{dc.criarEvento}</SkewTexto>
          </Link>
          <MenuUsuarioServer />
        </div>
      </nav>

      {/* HEADER */}
      <header className="relative overflow-hidden border-b border-white/8 px-6 pb-10 pt-14 md:px-12">
        <div className="disp pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-[240px] text-white/[0.03]">
          CALENDÁRIO
        </div>
        <div className="relative mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
          {dc.circuito} · {anoAtual}
        </div>
        <h1 className="disp relative text-[clamp(64px,9vw,132px)]">
          {dc.titulo}
        </h1>
        <p className="relative mt-2 max-w-[560px] text-lg font-medium text-muted-2">
          {dc.subtitulo}
        </p>
      </header>

      <CatalogoClient eventos={cards} />

      <VitrineClient stats={stats} bracket={bracket} ranking={ranking} />

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/8 px-6 py-[34px] md:px-12">
        <span className="disp text-[26px]">
          League<span className="text-brand">Mat</span>
        </span>
        <div className="flex flex-wrap items-center gap-6 font-cond text-sm uppercase tracking-[0.08em]">
          <Link href="/plataforma" className="text-text-2 transition-colors hover:text-brand">
            {dic.nav.plataforma}
          </Link>
          <Link href="/atleta" className="text-text-2 transition-colors hover:text-brand">
            {dic.nav.minhaArea}
          </Link>
          <span className="text-muted-3">
            © {anoAtual} · {dic.rodape}
          </span>
        </div>
      </footer>
    </div>
  );
}
