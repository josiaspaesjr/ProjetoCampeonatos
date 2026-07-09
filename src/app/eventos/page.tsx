import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes, lotes } from "@/db/schema";
import { Logo, SkewTexto } from "@/components/marca";
import { dataCurta, diaMesPartes } from "@/lib/datas";
import { CatalogoClient, type CardEvento } from "./catalogo-client";

export const metadata: Metadata = { title: "Eventos" };

// catálogo vem do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

const MODALIDADE_ROTULO: Record<string, string> = {
  gi_nogi: "Gi + No-Gi",
  gi: "Gi",
  nogi: "No-Gi",
};

export default async function CatalogoEventos() {
  const db = await getDb();

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

    const status = aoVivo
      ? "Ao vivo agora"
      : aberto
        ? "Inscrições abertas"
        : emBreve
          ? "Em breve"
          : e.status === "finalizado"
            ? "Finalizado"
            : "Inscrições encerradas";

    const { dia, mes } = diaMesPartes(e.dataInicio);
    const ano = new Date(`${e.dataInicio}T12:00:00`).getFullYear();
    const local = e.cidade ? `${e.cidade}${e.uf ? `/${e.uf}` : ""}` : "Local a definir";

    return {
      slug: e.slug,
      nome: e.nome,
      descricao: e.descricao,
      bannerUrl: e.bannerUrl,
      dia,
      mesAno: `${mes} ${ano}`,
      dataLonga: dataCurta(e.dataInicio),
      cidade: local,
      meta: `${local} · ${MODALIDADE_ROTULO[e.modalidade] ?? "Gi + No-Gi"}`,
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
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-8 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <Link href="/eventos" className="text-brand">
            Eventos
          </Link>
          <Link href="/#ranking" className="max-md:hidden transition-colors hover:text-brand">
            Ranking
          </Link>
          <Link href="/#aovivo" className="max-md:hidden transition-colors hover:text-brand">
            Ao vivo
          </Link>
          <Link href="/organizador" className="-skew-x-9 bg-brand px-5 py-2.5 text-white">
            <SkewTexto>Criar evento</SkewTexto>
          </Link>
        </div>
      </nav>

      {/* HEADER */}
      <header className="relative overflow-hidden border-b border-white/8 px-6 pb-10 pt-14 md:px-12">
        <div className="disp pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-[240px] text-white/[0.03]">
          CALENDÁRIO
        </div>
        <div className="relative mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
          Circuito · {anoAtual}
        </div>
        <h1 className="disp relative text-[clamp(64px,9vw,132px)]">
          Todos os eventos
        </h1>
        <p className="relative mt-2 max-w-[560px] text-lg font-medium text-muted-2">
          Cada etapa publicada na plataforma. Filtre por modalidade ou status e
          inscreva-se em dois cliques.
        </p>
      </header>

      <CatalogoClient eventos={cards} />

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/8 px-6 py-[34px] md:px-12">
        <span className="disp text-[26px]">
          BJJ<span className="text-brand">ARENA</span>
        </span>
        <span className="font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          © {anoAtual} · Sistema de competições de jiu-jitsu
        </span>
      </footer>
    </div>
  );
}
