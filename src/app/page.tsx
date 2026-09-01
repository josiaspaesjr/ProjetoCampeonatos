import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes, lotes } from "@/db/schema";
import { Logo, SkewTexto } from "@/components/marca";
import { AvisoPendencias } from "@/components/aviso-pendencias";
import { MenuUsuarioServer } from "@/components/menu-usuario-server";
import { dataCurta, diaMesPartes } from "@/lib/datas";
import { getDicionario } from "@/lib/i18n/server";
import { SeletorIdioma } from "@/lib/i18n/client";
import { CatalogoClient, type CardEvento } from "./catalogo-client";
import { MarcaViva } from "./marca-viva";

// o catálogo vem do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const dic = await getDicionario();
  const dc = dic.catalogo;
  const dh = dic.home;
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

  const [todosLotes, confirmadas] = await Promise.all([
    publicos.length
      ? db.query.lotes.findMany({
          where: inArray(lotes.eventoId, publicos.map((e) => e.id)),
          orderBy: asc(lotes.inicio),
        })
      : Promise.resolve([]),
    db.query.inscricoes.findMany({
      where: eq(inscricoes.status, "confirmada"),
    }),
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <AvisoPendencias />

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-6 font-cond text-base font-semibold uppercase tracking-[0.04em]">
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

      {/* HEADER — slogan de um lado, marca em movimento do outro */}
      <header className="relative overflow-hidden border-b border-white/8 px-6 pb-12 pt-14 md:px-12">
        <div className="grid items-center gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
              {dc.circuito} · {anoAtual}
            </div>
            <h1 className="disp text-[clamp(56px,8vw,124px)]">
              {dh.slogan} <span className="text-brand">{dh.sloganAccent}</span>.
            </h1>
            <p className="mt-4 max-w-[620px] text-lg font-medium text-muted-2">
              {dh.abaixo}
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 font-cond text-sm font-bold uppercase tracking-[0.1em] text-brand-soft">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4 animate-bounce motion-reduce:animate-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M12 4v15M5 13l7 7 7-7" />
              </svg>
              {dh.roleCue}
            </div>
          </div>
          <MarcaViva className="justify-self-center max-lg:order-first lg:justify-self-end" />
        </div>
      </header>

      <CatalogoClient eventos={cards} />

      {/* CONVITE PARA A PLATAFORMA */}
      <section className="relative overflow-hidden border-t border-white/8 px-6 py-[94px] text-center md:px-12">
        <div className="disp pointer-events-none absolute inset-x-0 top-0 flex justify-center whitespace-nowrap text-[280px] leading-none text-brand/[0.045]">
          ARENA
        </div>
        <div className="relative">
          <div className="mb-4 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
            {dh.ctaEyebrow}
          </div>
          <h2 className="disp text-[clamp(48px,8vw,110px)]">
            {dh.ctaTitulo} <span className="text-brand">{dh.ctaAccent}</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[18px] font-medium leading-normal text-text-2">
            {dh.ctaDesc}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/plataforma"
              className="-skew-x-9 bg-brand px-9 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white"
            >
              <SkewTexto>{dh.ctaBtn1}</SkewTexto>
            </Link>
            <Link
              href="/organizador"
              className="-skew-x-9 border border-white/28 px-9 py-4 font-cond text-lg font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
            >
              <SkewTexto>{dh.ctaBtn2}</SkewTexto>
            </Link>
          </div>
        </div>
      </section>

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
