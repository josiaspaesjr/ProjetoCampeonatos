"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo, SkewTexto } from "@/components/marca";
import { useIdioma } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { RankingGeral } from "@/lib/ranking";

/* ------------------------------------------------------------------------ */
/* Dados vindos do servidor                                                  */
/* ------------------------------------------------------------------------ */

export interface LadoBracket {
  nome: string;
  placar: string;
  venceu: boolean;
}

export interface BracketVivo {
  demo: boolean;
  titulo: string;
  esquerda: LadoBracket[];
  direita: LadoBracket[];
  href: string;
}

export interface StatLanding {
  valor: string;
  destaque: boolean;
}

/* ------------------------------------------------------------------------ */
/* i18n — só a landing traduz; escolha persistida em localStorage            */
/* ------------------------------------------------------------------------ */

type Lang = "pt" | "en" | "es";

const DICT = {
  pt: {
    navEventos: "Eventos",
    navRanking: "Ranking",
    navAoVivo: "Ao vivo",
    navCriar: "Criar evento",
    navEntrar: "Entrar",
    heroBadge: "O sistema operacional do jiu-jitsu",
    heroL1: "Toda competição.",
    heroL2pre: "Uma",
    heroAccent: "arena",
    heroDesc:
      "Inscrições, pesagem, chaveamento ao vivo e ranking oficial. Federações e academias rodam o campeonato inteiro de ponta a ponta — do primeiro Pix ao pódio.",
    heroBtn1: "Criar meu evento →",
    heroBtn2: "Ver ao vivo",
    ticker: [
      "Gi & No-Gi",
      "Chaveamento ao vivo",
      "Ranking oficial",
      "Pix integrado",
      "Arbitragem certificada",
    ],
    featEyebrow: "Uma plataforma, tudo integrado",
    featTitle: "Feito para federações e academias",
    features: [
      { t: "Inscrições & Pix", d: "pagamento integrado" },
      { t: "Pesagem & check-in", d: "no dia, sem fila" },
      { t: "Chaveamento ao vivo", d: "gerado automático" },
      { t: "Ranking oficial", d: "por faixa e peso" },
    ],
    statLabels: ["Eventos", "Atletas", "Equipes", "Inscrições"],
    comoEyebrow: "Como funciona",
    comoTitle: "Da inscrição ao pódio",
    steps: [
      {
        title: "Crie o perfil",
        desc: "Cadastro único com faixa, peso e equipe, reutilizável em todas as etapas.",
      },
      {
        title: "Inscreva-se",
        desc: "Categoria detectada pelo perfil, pesagem e pagamento via Pix integrados.",
      },
      {
        title: "Acompanhe a chave",
        desc: "Chaveamento ao vivo com chamada de área e notificação antes de cada luta.",
      },
      {
        title: "Suba no ranking",
        desc: "Cada resultado alimenta o ranking oficial por faixa, idade e peso.",
      },
    ],
    liveEyebrowDemo: "Como você acompanha",
    liveEyebrowLive: "Ao vivo agora",
    liveTitle: "Chaveamento em tempo real",
    liveOpen: "Abrir chaveamento →",
    liveEmpty: "Exemplo de chave em disputa",
    liveNow: "Chave em disputa agora",
    rankEyebrow: "Ranking do circuito",
    rankTitle: "Os melhores do circuito",
    rankEmpty:
      "O ranking nasce quando as primeiras chaves forem concluídas.",
    rankTabs: { adulto: "Adulto", master: "Master", feminino: "Feminino" },
    ctaTitle: "O tatame,",
    ctaAccent: "organizado",
    ctaBtn1: "Criar meu evento",
    ctaBtn2: "Sou atleta",
    footer: "© 2026 · Sistema de competições de jiu-jitsu",
  },
  en: {
    navEventos: "Events",
    navRanking: "Ranking",
    navAoVivo: "Live",
    navCriar: "Create event",
    navEntrar: "Sign in",
    heroBadge: "The operating system of competitive jiu-jitsu",
    heroL1: "Every competition.",
    heroL2pre: "One",
    heroAccent: "arena",
    heroDesc:
      "Registration, weigh-in, live brackets and official ranking. Federations and gyms run the whole championship end to end — from the first payment to the podium.",
    heroBtn1: "Create my event →",
    heroBtn2: "Watch live",
    ticker: [
      "Gi & No-Gi",
      "Live brackets",
      "Official ranking",
      "Integrated payments",
      "Certified refereeing",
    ],
    featEyebrow: "One platform, fully integrated",
    featTitle: "Built for federations and gyms",
    features: [
      { t: "Registration & payments", d: "built-in checkout" },
      { t: "Weigh-in & check-in", d: "on-site, no queue" },
      { t: "Live brackets", d: "auto-generated" },
      { t: "Official ranking", d: "by belt and weight" },
    ],
    statLabels: ["Events", "Athletes", "Teams", "Registrations"],
    comoEyebrow: "How it works",
    comoTitle: "From sign-up to the podium",
    steps: [
      {
        title: "Create a profile",
        desc: "One profile with belt, weight and team, reused across every stage.",
      },
      {
        title: "Register",
        desc: "Category detected from your profile, weigh-in and payment built in.",
      },
      {
        title: "Follow the bracket",
        desc: "Live brackets with mat calls and a heads-up before every match.",
      },
      {
        title: "Climb the ranking",
        desc: "Every result feeds the official ranking by belt, age and weight.",
      },
    ],
    liveEyebrowDemo: "How you follow along",
    liveEyebrowLive: "Live now",
    liveTitle: "Real-time brackets",
    liveOpen: "Open bracket →",
    liveEmpty: "Sample bracket in play",
    liveNow: "Bracket in play right now",
    rankEyebrow: "Circuit ranking",
    rankTitle: "The best on the circuit",
    rankEmpty: "The ranking is born once the first brackets finish.",
    rankTabs: { adulto: "Adult", master: "Master", feminino: "Female" },
    ctaTitle: "The mat,",
    ctaAccent: "organized",
    ctaBtn1: "Create my event",
    ctaBtn2: "I am an athlete",
    footer: "© 2026 · Jiu-jitsu competition system",
  },
  es: {
    navEventos: "Eventos",
    navRanking: "Ranking",
    navAoVivo: "En vivo",
    navCriar: "Crear evento",
    navEntrar: "Entrar",
    heroBadge: "El sistema operativo del jiu-jitsu competitivo",
    heroL1: "Toda competición.",
    heroL2pre: "Una",
    heroAccent: "arena",
    heroDesc:
      "Inscripciones, pesaje, llaves en vivo y ranking oficial. Federaciones y academias organizan todo el campeonato de principio a fin — del primer pago al podio.",
    heroBtn1: "Crear mi evento →",
    heroBtn2: "Ver en vivo",
    ticker: [
      "Gi y No-Gi",
      "Llaves en vivo",
      "Ranking oficial",
      "Pagos integrados",
      "Arbitraje certificado",
    ],
    featEyebrow: "Una plataforma, todo integrado",
    featTitle: "Hecho para federaciones y academias",
    features: [
      { t: "Inscripciones y pagos", d: "cobro integrado" },
      { t: "Pesaje y check-in", d: "en el día, sin fila" },
      { t: "Llaves en vivo", d: "generadas automático" },
      { t: "Ranking oficial", d: "por cinturón y peso" },
    ],
    statLabels: ["Eventos", "Atletas", "Equipos", "Inscripciones"],
    comoEyebrow: "Cómo funciona",
    comoTitle: "De la inscripción al podio",
    steps: [
      {
        title: "Crea el perfil",
        desc: "Perfil único con cinturón, peso y equipo, reutilizable en cada etapa.",
      },
      {
        title: "Inscríbete",
        desc: "Categoría detectada por tu perfil, pesaje y pago integrados.",
      },
      {
        title: "Sigue la llave",
        desc: "Llaves en vivo con llamado de área y aviso antes de cada combate.",
      },
      {
        title: "Sube en el ranking",
        desc: "Cada resultado alimenta el ranking oficial por cinturón, edad y peso.",
      },
    ],
    liveEyebrowDemo: "Cómo lo sigues",
    liveEyebrowLive: "En vivo ahora",
    liveTitle: "Llaves en tiempo real",
    liveOpen: "Abrir llave →",
    liveEmpty: "Ejemplo de llave en disputa",
    liveNow: "Llave en disputa ahora",
    rankEyebrow: "Ranking del circuito",
    rankTitle: "Los mejores del circuito",
    rankEmpty: "El ranking nace cuando terminan las primeras llaves.",
    rankTabs: { adulto: "Adulto", master: "Master", feminino: "Femenino" },
    ctaTitle: "El tatami,",
    ctaAccent: "organizado",
    ctaBtn1: "Crear mi evento",
    ctaBtn2: "Soy atleta",
    footer: "© 2026 · Sistema de competiciones de jiu-jitsu",
  },
} as const;

type Dict = (typeof DICT)[Lang];

const LANGS: { code: string; id: Lang }[] = [
  { code: "PT", id: "pt" },
  { code: "EN", id: "en" },
  { code: "ES", id: "es" },
];

/* ------------------------------------------------------------------------ */
/* Página                                                                    */
/* ------------------------------------------------------------------------ */

export function LandingClient({
  stats,
  ranking,
  bracket,
}: {
  stats: StatLanding[];
  ranking: RankingGeral;
  bracket: BracketVivo;
}) {
  // idioma global (cookie + provider) — trocar reflete em todo o sistema
  const { locale: lang, trocar: trocarLang } = useIdioma();
  const [abaRanking, setAbaRanking] = useState<keyof RankingGeral>("adulto");

  const t: Dict = DICT[lang];
  const linhasRanking = ranking[abaRanking].slice(0, 5);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-7 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <Link href="/eventos" className="max-md:hidden transition-colors hover:text-brand">
            {t.navEventos}
          </Link>
          <a href="#ranking" className="max-md:hidden transition-colors hover:text-brand">
            {t.navRanking}
          </a>
          <a href="#aovivo" className="max-md:hidden transition-colors hover:text-brand">
            {t.navAoVivo}
          </a>
          <div className="flex items-center border border-white/16">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => trocarLang(l.id)}
                className={cn(
                  "px-3 py-1.5 font-cond text-sm font-bold tracking-[0.06em] transition-colors",
                  lang === l.id ? "bg-brand text-white" : "text-muted-2 hover:text-foreground",
                )}
              >
                {l.code}
              </button>
            ))}
          </div>
          <Link href="/acesso" className="transition-colors hover:text-brand">
            {t.navEntrar}
          </Link>
          <Link href="/organizador" className="-skew-x-9 bg-brand px-5 py-2.5 text-white">
            <SkewTexto>{t.navCriar}</SkewTexto>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative flex min-h-[92vh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-stripes-hero" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,13,0.96)_0%,rgba(12,12,13,0.82)_42%,rgba(12,12,13,0.45)_100%)]" />
        <div className="pointer-events-none absolute -right-10 top-[44%] -translate-y-1/2">
          <div className="disp whitespace-nowrap text-[340px] tracking-[0.02em] text-white/[0.03]">
            JIU-JITSU
          </div>
        </div>

        <div className="relative z-[2] w-full px-6 md:px-12">
          <div className="mb-6 inline-flex -skew-x-9 items-center bg-brand px-4 py-2 font-cond text-[15px] font-semibold uppercase tracking-[0.08em] text-white">
            <SkewTexto>
              <span className="h-2 w-2 rounded-full bg-white animate-pulse-dot" />
              {t.heroBadge}
            </SkewTexto>
          </div>
          <h1 className="disp max-w-[1100px] text-[clamp(80px,13vw,200px)] tracking-[0.005em]">
            {t.heroL1}
            <br />
            {t.heroL2pre} <span className="text-brand">{t.heroAccent}</span>.
          </h1>
          <div className="mt-8 flex flex-wrap items-end gap-11">
            <p className="max-w-[460px] text-[19px] font-medium leading-normal text-text-2">
              {t.heroDesc}
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/organizador"
                className="-skew-x-9 bg-brand px-8 py-4 font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white"
              >
                <SkewTexto>{t.heroBtn1}</SkewTexto>
              </Link>
              <a
                href="#aovivo"
                className="-skew-x-9 border border-white/28 px-8 py-4 font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
              >
                <SkewTexto>{t.heroBtn2}</SkewTexto>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="-mt-1.5 -skew-y-[0.6deg] overflow-hidden bg-brand py-2.5">
        <div className="flex w-max animate-marquee font-cond text-[19px] font-bold uppercase tracking-[0.08em] text-white">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex" aria-hidden={copia === 1}>
              {t.ticker.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="px-[22px]">{item}</span>
                  <span>/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES + STATS */}
      <section className="border-b border-white/8 px-6 py-[72px] md:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative overflow-hidden border border-white/12 bg-surface p-8 px-[34px]">
            <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
            <div className="mb-2 font-cond text-[15px] font-semibold uppercase tracking-[0.1em] text-brand">
              {t.featEyebrow}
            </div>
            <h3 className="disp mb-[18px] text-[52px]">{t.featTitle}</h3>
            <div className="flex flex-col gap-0.5">
              {t.features.map((ft) => (
                <div
                  key={ft.t}
                  className="flex items-center gap-3.5 border-t border-white/8 py-3"
                >
                  <span className="h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
                  <span className="font-cond text-[22px] font-semibold uppercase tracking-[0.02em]">
                    {ft.t}
                  </span>
                  <span className="ml-auto text-sm font-medium text-muted-2">
                    {ft.d}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 border-l border-white/10">
            {stats.map((s, i) => (
              <div
                key={i}
                className="border-b border-r border-white/10 px-[30px] py-[26px]"
              >
                <div
                  className={cn(
                    "disp tnum text-[76px]",
                    s.destaque ? "text-brand" : "text-foreground",
                  )}
                >
                  {s.valor}
                </div>
                <div className="mt-0.5 font-cond text-[15px] uppercase tracking-[0.08em] text-muted-2">
                  {t.statLabels[i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA (SEÇÃO CLARA INCLINADA) */}
      <section className="-mx-5 -skew-y-[1.2deg] bg-paper px-6 py-[84px] text-ink md:px-12">
        <div className="skew-y-[1.2deg] px-5">
          <div className="relative mb-11">
            <div className="disp pointer-events-none absolute -top-10 left-0 text-[120px] text-ink/5">
              01
            </div>
            <div className="relative mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
              {t.comoEyebrow}
            </div>
            <h2 className="disp relative text-[72px]">{t.comoTitle}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((st, i) => (
              <div key={st.title}>
                <div className="disp text-[64px] leading-[0.8] text-brand">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="my-3.5 h-[3px] w-11 bg-ink" />
                <div className="disp mb-2 text-[32px]">{st.title}</div>
                <p className="text-[15px] font-medium leading-normal text-[#4A4A47]">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AO VIVO / RANKING */}
      <section id="aovivo" className="px-6 py-[84px] md:px-12">
        <div className="grid gap-11 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em] text-brand">
              <span
                className={cn(
                  "h-2 w-2 rounded-full animate-pulse-dot",
                  bracket.demo ? "bg-brand" : "bg-live",
                )}
              />
              {bracket.demo ? t.liveEyebrowDemo : t.liveEyebrowLive}
            </div>
            <h2 className="disp mb-[22px] text-[56px]">{t.liveTitle}</h2>
            <div className="border border-white/10 bg-surface">
              <div className="flex items-center justify-between border-b border-white/8 px-[18px] py-3 font-cond text-sm uppercase tracking-[0.08em] text-muted-2">
                <span>{bracket.titulo}</span>
                <span className="text-brand">
                  {bracket.demo ? t.liveEmpty : t.liveNow}
                </span>
              </div>
              {[...bracket.esquerda, ...bracket.direita].map((m, i) => (
                <div
                  key={`${m.nome}-${i}`}
                  className={cn(
                    "flex items-center justify-between border-b border-white/6 px-[18px] py-[15px]",
                    m.venceu && "bg-brand/6",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-[26px] w-1.5",
                        m.venceu ? "bg-brand" : "bg-white/15",
                      )}
                    />
                    <span
                      className={cn(
                        "font-cond text-[22px] font-semibold uppercase",
                        m.venceu ? "text-foreground" : "text-muted-2",
                      )}
                    >
                      {m.nome}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "disp tnum text-[34px]",
                      m.venceu ? "text-brand" : "text-muted-2",
                    )}
                  >
                    {m.placar}
                  </span>
                </div>
              ))}
              <div className="px-[18px] py-3">
                <Link
                  href={bracket.href}
                  className="font-cond text-sm font-bold uppercase tracking-[0.08em] text-brand-soft hover:text-brand"
                >
                  {t.liveOpen}
                </Link>
              </div>
            </div>
          </div>

          <div id="ranking">
            <div className="mb-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em] text-brand">
              {t.rankEyebrow}
            </div>
            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
              <h2 className="disp text-[56px]">{t.rankTitle}</h2>
              <div className="flex gap-1.5">
                {(Object.keys(t.rankTabs) as (keyof RankingGeral)[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setAbaRanking(k)}
                    className={cn(
                      "px-3 py-1.5 font-cond text-sm font-bold uppercase tracking-[0.06em] transition-colors",
                      abaRanking === k
                        ? "bg-brand text-white"
                        : "border border-white/15 text-muted-2 hover:text-foreground",
                    )}
                  >
                    {t.rankTabs[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="border border-white/10">
              {linhasRanking.length === 0 ? (
                <div className="px-[18px] py-8 font-cond text-base text-muted-3">
                  {t.rankEmpty}
                </div>
              ) : (
                linhasRanking.map((r, i) => (
                  <div
                    key={`${r.nome}-${i}`}
                    className={cn(
                      "grid grid-cols-[56px_1fr_auto] items-center border-b border-white/6 px-[18px] py-3.5",
                      i === 0 && "bg-brand/6",
                    )}
                  >
                    <span
                      className={cn(
                        "disp text-[40px]",
                        i === 0
                          ? "text-brand"
                          : i < 3
                            ? "text-foreground"
                            : "text-muted-2",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-cond text-[22px] font-semibold uppercase">
                        {r.nome}
                      </div>
                      <div className="text-[13px] font-medium text-muted-2">
                        {r.equipe}
                      </div>
                    </div>
                    <span className="disp tnum text-[34px] text-brand">
                      {r.pontos.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden border-t border-white/8 px-6 py-[110px] text-center md:px-12">
        <div className="disp pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-[300px] text-brand/6">
          ARENA
        </div>
        <div className="relative">
          <h2 className="disp text-[clamp(60px,10vw,140px)]">
            {t.ctaTitle}
            <br />
            <span className="text-brand">{t.ctaAccent}</span>.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/organizador"
              className="-skew-x-9 bg-brand px-10 py-[17px] font-cond text-xl font-bold uppercase tracking-[0.04em] text-white"
            >
              <SkewTexto>{t.ctaBtn1}</SkewTexto>
            </Link>
            <Link
              href="/eventos"
              className="-skew-x-9 border border-white/28 px-10 py-[17px] font-cond text-xl font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
            >
              <SkewTexto>{t.ctaBtn2}</SkewTexto>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/8 px-6 py-[34px] md:px-12">
        <span className="disp text-[26px]">
          BJJ<span className="text-brand">ARENA</span>
        </span>
        <span className="font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          {t.footer}
        </span>
      </footer>
    </div>
  );
}
