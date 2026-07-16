import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo, PontoVivo, SkewTexto } from "@/components/marca";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { getDicionario } from "@/lib/i18n/server";
import { cadastrar, entrar } from "./actions";

type Tipo = "atleta" | "organizador";

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    erro?: string;
    modo?: string;
    tipo?: string;
  }>;
}) {
  if (!supabaseConfigurado()) redirect("/");
  const { next = "/", erro, modo, tipo: tipoParam } = await searchParams;
  const dic = await getDicionario();
  const de = dic.admin.entrar;

  const tipo: Tipo | null =
    tipoParam === "atleta" || tipoParam === "organizador" ? tipoParam : null;
  const cadastro = modo === "cadastro";
  // três telas: escolha do tipo, formulário de cadastro (com tipo), login
  const view: "escolha" | "cadastro" | "login" = cadastro
    ? tipo
      ? "cadastro"
      : "escolha"
    : "login";

  const nextQ = `next=${encodeURIComponent(next)}`;

  // painel de marca (esquerda) — muda com o tipo escolhido no cadastro
  const painel =
    view === "cadastro" && tipo === "atleta"
      ? {
          eyebrow: de.atletaArea,
          titulo: de.atletaHeroTitulo,
          accent: de.atletaHeroAccent,
          desc: de.atletaHeroDesc,
        }
      : view === "cadastro" && tipo === "organizador"
        ? {
            eyebrow: de.orgArea,
            titulo: de.orgHeroTitulo,
            accent: de.orgHeroAccent,
            desc: de.orgHeroDesc,
          }
        : {
            eyebrow: de.eyebrowNeutro,
            titulo: de.heroTitulo,
            accent: de.heroAccent,
            desc: de.heroDesc,
          };

  const tituloForm =
    view === "escolha"
      ? de.escolhaTitulo
      : view === "cadastro"
        ? de.criarConta
        : de.entrar;
  const subForm =
    view === "escolha"
      ? de.escolhaSub
      : view === "cadastro"
        ? tipo === "atleta"
          ? de.atletaSubCriar
          : de.orgSubCriar
        : de.subEntrar;

  const labelCls =
    "font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-2";

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_0.95fr]">
      {/* PAINEL DE MARCA */}
      <div className="relative flex flex-col justify-between overflow-hidden border-r border-white/8 p-11 px-6 max-lg:hidden md:px-12">
        <div className="absolute inset-0 bg-stripes-hero" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,13,0.82),rgba(12,12,13,0.92))]" />
        <div className="pointer-events-none absolute -right-14 bottom-[8%]">
          <div className="disp whitespace-nowrap text-[280px] text-white/[0.03]">
            TATAME
          </div>
        </div>

        <div className="relative">
          <Logo />
        </div>

        <div className="relative">
          <div className="mb-3.5 inline-flex items-center gap-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em] text-brand">
            <PontoVivo />
            {painel.eyebrow}
          </div>
          <h1 className="disp max-w-[520px] text-[clamp(56px,6vw,96px)]">
            {painel.titulo} <span className="text-brand">{painel.accent}</span>.
          </h1>
          <p className="mt-[18px] max-w-[420px] text-[17px] font-medium leading-normal text-text-2">
            {painel.desc}
          </p>
        </div>

        <div className="relative font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          © {new Date().getFullYear()} · {dic.rodape}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="flex items-center justify-center p-11 px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="disp mb-1 text-[56px]">{tituloForm}</div>
          <p className="mb-[34px] text-[15px] font-medium text-muted-2">
            {subForm}
          </p>

          {erro && (
            <p className="mb-5 border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          {/* ESCOLHA DO TIPO DE CONTA */}
          {view === "escolha" && (
            <>
              <div className="flex flex-col gap-4">
                <EscolhaCard
                  href={`/entrar?modo=cadastro&tipo=atleta&${nextQ}`}
                  eyebrow={de.atletaEyebrow}
                  titulo={de.contaAtleta}
                  desc={de.atletaCardDesc}
                  cta={de.criarAtletaBtn}
                />
                <EscolhaCard
                  href={`/entrar?modo=cadastro&tipo=organizador&${nextQ}`}
                  eyebrow={de.orgEyebrow}
                  titulo={de.contaOrganizador}
                  desc={de.orgCardDesc}
                  cta={de.criarOrgBtn}
                />
              </div>

              <p className="mt-8 text-center text-sm font-medium text-muted-2">
                {de.jaTemConta}{" "}
                <Link
                  href={`/entrar?${nextQ}`}
                  className="font-semibold text-brand hover:text-foreground"
                >
                  {de.entrar}
                </Link>
              </p>
            </>
          )}

          {/* FORMULÁRIO (cadastro por tipo OU login) */}
          {view !== "escolha" && (
            <>
              <form
                action={cadastro ? cadastrar : entrar}
                className="flex flex-col gap-5"
              >
                <input type="hidden" name="next" value={next} />
                {view === "cadastro" && (
                  <input type="hidden" name="tipo" value={tipo ?? "atleta"} />
                )}
                {view === "cadastro" && (
                  <div className="flex flex-col gap-[9px]">
                    <label className={labelCls} htmlFor="login-nome">
                      {de.nomeCompleto}
                    </label>
                    <Input
                      id="login-nome"
                      name="nome"
                      required
                      className="h-12"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-[9px]">
                  <label className={labelCls} htmlFor="login-email">
                    {de.email}
                  </label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    placeholder="voce@email.com"
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-[9px]">
                  <label className={labelCls} htmlFor="login-senha">
                    {de.senha} {view === "cadastro" && de.senhaMin}
                  </label>
                  <Input
                    id="login-senha"
                    name="senha"
                    type="password"
                    required
                    minLength={view === "cadastro" ? 6 : undefined}
                    placeholder="••••••••"
                    className="h-12"
                  />
                </div>

                <BotaoAcaoBruto className="mt-2 flex h-[52px] -skew-x-9 items-center justify-center bg-brand font-cond text-xl font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
                  <SkewTexto>
                    {view === "cadastro" ? de.criarContaBtn : de.entrarBtn}
                  </SkewTexto>
                </BotaoAcaoBruto>
              </form>

              <div className="my-6 flex items-center gap-3.5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="font-cond text-[13px] uppercase tracking-[0.1em] text-muted-3">
                  {de.ou}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {view === "cadastro" ? (
                <div className="flex flex-col items-center gap-3 text-center text-sm font-medium text-muted-2">
                  <Link
                    href={`/entrar?modo=cadastro&${nextQ}`}
                    className="font-cond uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
                  >
                    {de.trocarTipo}
                  </Link>
                  <p>
                    {de.jaTemConta}{" "}
                    <Link
                      href={`/entrar?${nextQ}`}
                      className="font-semibold text-brand hover:text-foreground"
                    >
                      {de.entrar}
                    </Link>
                  </p>
                </div>
              ) : (
                <p className="text-center text-sm font-medium text-muted-2">
                  {de.aindaNaoTemConta}{" "}
                  <Link
                    href={`/entrar?modo=cadastro&${nextQ}`}
                    className="font-semibold text-brand hover:text-foreground"
                  >
                    {de.criarContaLink}
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Cartão de escolha do tipo de conta (atleta / organizador). */
function EscolhaCard({
  href,
  eyebrow,
  titulo,
  desc,
  cta,
}: {
  href: string;
  eyebrow: string;
  titulo: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden border border-white/12 bg-surface p-6 transition-colors hover:border-brand/55"
    >
      <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
      <div className="font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
        {eyebrow}
      </div>
      <div className="disp mt-1 text-[34px]">{titulo}</div>
      <p className="mt-2 text-[14px] font-medium leading-normal text-muted-2">
        {desc}
      </p>
      <div className="mt-4 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-brand">
        {cta}
      </div>
    </Link>
  );
}
