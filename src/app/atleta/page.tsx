import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { academias } from "@/db/schema";
import { sair } from "@/app/entrar/actions";
import { Logo } from "@/components/marca";
import { AcaoTexto } from "@/components/ui/botao-acao";
import { historicoDoAtleta, type Colocacao } from "@/lib/atleta";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { dataCurta } from "@/lib/datas";
import { perfilDeAcesso } from "@/lib/perfil-acesso";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Área do atleta" };
export const dynamic = "force-dynamic";

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MEDALHA: Record<
  Colocacao,
  { rotulo: string; icone: string; cor: string; borda: string }
> = {
  ouro: { rotulo: "1º lugar", icone: "🥇", cor: "#E5C14E", borda: "border-[#E5C14E]/50" },
  prata: { rotulo: "2º lugar", icone: "🥈", cor: "#C7CBD1", borda: "border-[#C7CBD1]/40" },
  bronze: { rotulo: "3º lugar", icone: "🥉", cor: "#CD7F32", borda: "border-[#CD7F32]/50" },
  participante: {
    rotulo: "Participou",
    icone: "",
    cor: "#9C9A93",
    borda: "border-white/14",
  },
  pendente: {
    rotulo: "Em disputa",
    icone: "",
    cor: "#EE9A94",
    borda: "border-brand/40",
  },
};

export default async function AreaAtleta() {
  const perfil = await perfilDeAcesso();
  if (!perfil) {
    redirect(supabaseConfigurado() ? "/entrar?next=/atleta" : "/");
  }

  const { usuario, ehOrganizador } = perfil;
  const db = await getDb();
  const { participacoes, resumo } = await historicoDoAtleta(db, usuario.id);

  // equipe/faixa: perfil do usuário, com fallback no snapshot da inscrição
  const academia = usuario.academiaId
    ? await db.query.academias.findFirst({
        where: eq(academias.id, usuario.academiaId),
      })
    : null;
  const faixa = usuario.faixaAtual ?? participacoes[0]?.faixa ?? null;
  const equipe = academia?.nome ?? null;

  const stats = [
    { rotulo: "Campeonatos", valor: String(resumo.campeonatos), destaque: false },
    { rotulo: "Lutas", valor: String(resumo.lutas), destaque: false },
    { rotulo: "Vitórias", valor: String(resumo.vitorias), destaque: false },
    { rotulo: "Pódios", valor: String(resumo.podios), destaque: true },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-6 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <Link href="/eventos" className="max-sm:hidden transition-colors hover:text-brand">
            Eventos
          </Link>
          <Link
            href="/minhas-inscricoes"
            className="max-sm:hidden text-muted-2 transition-colors hover:text-brand"
          >
            Inscrições
          </Link>
          {ehOrganizador && (
            <Link
              href="/organizador"
              className="text-muted-2 transition-colors hover:text-brand"
            >
              Painel
            </Link>
          )}
          {supabaseConfigurado() && (
            <form action={sair}>
              <AcaoTexto className="uppercase text-muted-2 transition-colors hover:text-foreground">
                Sair
              </AcaoTexto>
            </form>
          )}
        </div>
      </nav>

      {/* HEADER DO ATLETA */}
      <header className="relative overflow-hidden border-b border-white/8 px-6 pb-10 pt-14 md:px-12">
        <div className="disp pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-[220px] text-white/[0.03]">
          ATLETA
        </div>
        <div className="relative flex flex-wrap items-end gap-x-6 gap-y-4">
          <div
            className="flex h-16 w-16 shrink-0 -skew-x-9 items-center justify-center border-2"
            style={{ borderColor: corDaFaixa(faixa) }}
          >
            <span className="disp skew-x-9 text-4xl leading-none text-foreground">
              {usuario.nome.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="mb-1 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
              Área do atleta
            </div>
            <h1 className="disp text-[clamp(44px,6vw,84px)] leading-[0.9]">
              {usuario.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-cond text-base uppercase tracking-[0.05em] text-muted-2">
              {faixa && (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 -skew-x-9 border border-white/20"
                    style={{ background: corDaFaixa(faixa) }}
                  />
                  Faixa {capitalizar(faixa)}
                </span>
              )}
              {faixa && equipe && <span className="text-brand">◆</span>}
              {equipe && <span>{equipe}</span>}
              <span className="text-brand">◆</span>
              <span className="normal-case tracking-normal text-muted-3">
                {usuario.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* STATS */}
      <section className="border-b border-white/8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.rotulo}
              className="border-b border-r border-white/8 px-6 py-7 md:border-b-0 md:px-12"
            >
              <div
                className={cn(
                  "disp tnum text-[64px] leading-none",
                  s.destaque ? "text-brand" : "text-foreground",
                )}
              >
                {s.valor}
              </div>
              <div className="mt-1.5 font-cond text-sm uppercase tracking-[0.08em] text-muted-2">
                {s.rotulo}
              </div>
            </div>
          ))}
        </div>
        {resumo.podios > 0 && (
          <div className="flex flex-wrap gap-5 border-t border-white/8 px-6 py-4 font-cond text-sm uppercase tracking-[0.06em] text-muted-2 md:px-12">
            {resumo.ouros > 0 && <span>🥇 {resumo.ouros} ouro{resumo.ouros === 1 ? "" : "s"}</span>}
            {resumo.pratas > 0 && <span>🥈 {resumo.pratas} prata{resumo.pratas === 1 ? "" : "s"}</span>}
            {resumo.bronzes > 0 && <span>🥉 {resumo.bronzes} bronze{resumo.bronzes === 1 ? "" : "s"}</span>}
            {resumo.lutas > 0 && (
              <span className="text-muted-3">
                cartel {resumo.vitorias}V–{resumo.derrotas}D
              </span>
            )}
          </div>
        )}
      </section>

      {/* CAMPEONATOS */}
      <section className="px-6 py-12 md:px-12">
        <div className="mb-6 flex items-baseline gap-3">
          <h2 className="disp text-[40px]">Campeonatos</h2>
          <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
            {participacoes.length} participaç{participacoes.length === 1 ? "ão" : "ões"}
          </span>
        </div>

        {participacoes.length === 0 ? (
          <div className="border border-dashed border-white/16 p-12 text-center">
            <div className="disp text-[32px] text-white/25">
              Você ainda não competiu
            </div>
            <p className="mt-2 text-[15px] font-medium text-muted-2">
              Suas disputas e resultados aparecem aqui assim que você entrar em
              um campeonato.
            </p>
            <Link
              href="/eventos"
              className="mt-6 inline-flex -skew-x-9 items-center bg-brand px-6 py-3 font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
            >
              <span className="inline-block skew-x-9">Ver campeonatos →</span>
            </Link>
          </div>
        ) : (
          <div className="border border-white/10">
            {participacoes.map((p) => {
              const m = MEDALHA[p.colocacao];
              const conteudo = (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/6 px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.02]">
                  {/* colocação */}
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 flex-col items-center justify-center border text-center",
                      m.borda,
                    )}
                  >
                    {m.icone ? (
                      <span className="text-2xl leading-none">{m.icone}</span>
                    ) : (
                      <span
                        className="disp text-2xl leading-none"
                        style={{ color: m.cor }}
                      >
                        {p.colocacao === "pendente" ? "—" : p.totalLutas}
                      </span>
                    )}
                  </div>

                  {/* evento + categoria */}
                  <div className="min-w-0 flex-1">
                    <div className="font-cond text-[22px] font-semibold uppercase leading-tight">
                      {p.eventoNome}
                    </div>
                    <div className="mt-0.5 font-cond text-sm uppercase tracking-[0.04em] text-muted-2">
                      {p.categoriaNome}
                      {p.dataEvento && ` · ${dataCurta(p.dataEvento)}`}
                    </div>
                  </div>

                  {/* cartel */}
                  {p.totalLutas > 0 && (
                    <div className="text-right">
                      <div className="tnum font-cond text-lg font-semibold">
                        {p.vitorias}
                        <span className="text-success">V</span>
                        <span className="mx-0.5 text-muted-3">·</span>
                        {p.derrotas}
                        <span className="text-brand">D</span>
                      </div>
                      <div className="font-cond text-xs uppercase tracking-[0.06em] text-muted-3">
                        {p.totalLutas} luta{p.totalLutas === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}

                  {/* colocação (rótulo) */}
                  <div
                    className="w-[110px] shrink-0 text-right font-cond text-sm font-semibold uppercase tracking-[0.06em]"
                    style={{ color: m.cor }}
                  >
                    {m.rotulo}
                    {p.chaveUrl && (
                      <div className="mt-0.5 font-cond text-xs font-normal normal-case tracking-normal text-brand">
                        ver chave →
                      </div>
                    )}
                  </div>
                </div>
              );

              return p.chaveUrl ? (
                <Link key={p.inscricaoId} href={p.chaveUrl} className="block">
                  {conteudo}
                </Link>
              ) : (
                <div key={p.inscricaoId}>{conteudo}</div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/minhas-inscricoes"
            className="font-cond text-sm font-semibold uppercase tracking-[0.06em] text-brand-soft transition-colors hover:text-brand"
          >
            Inscrições, pagamentos e QR de check-in →
          </Link>
        </div>
      </section>
    </div>
  );
}
