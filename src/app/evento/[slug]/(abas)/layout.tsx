import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContadoresEvento,
  getEventoPublico,
  statusDoEvento,
} from "@/lib/evento-publico";
import { AvisoPendencias } from "@/components/aviso-pendencias";
import { Logo, SkewTexto } from "@/components/marca";
import { AbasEvento } from "@/components/evento/abas-evento";
import { dataCompleta } from "@/lib/datas";

export default async function LayoutEvento({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();

  const { evento, loteVigente, inscricoesAbertas } = dados;
  const contadores = await getContadoresEvento(evento.id);
  const status = statusDoEvento(evento.status, inscricoesAbertas);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/8 bg-ink/90 px-6 backdrop-blur-xl md:px-12">
        <Logo tamanho={30} />
        <div className="flex items-center gap-7 font-cond text-base font-semibold uppercase tracking-[0.04em]">
          <Link
            href="/eventos"
            className="max-sm:hidden transition-colors hover:text-brand"
          >
            ← Todos os eventos
          </Link>
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

      <AvisoPendencias />

      {/* HERO BANNER */}
      <header className="relative flex h-[clamp(340px,44vh,460px)] items-end overflow-hidden">
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
        <div className="pointer-events-none relative z-[2] w-full px-6 pb-9 md:px-12">
          <div className="mb-[18px] flex flex-wrap gap-2.5">
            <span className="inline-flex -skew-x-9 items-center bg-brand px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-white">
              <SkewTexto>
                {status.vivo && (
                  <span className="h-[7px] w-[7px] rounded-full bg-white animate-pulse-dot" />
                )}
                {status.rotulo}
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
          <h1 className="disp max-w-[1000px] text-[clamp(44px,7vw,96px)]">
            {evento.nome}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-cond text-lg uppercase tracking-[0.05em] text-text-2">
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

      {/* SUB-ABAS */}
      <AbasEvento slug={evento.slug} contadores={contadores} />

      {/* CONTEÚDO DA ABA */}
      {children}

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
