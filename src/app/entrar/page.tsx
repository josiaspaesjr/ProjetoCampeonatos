import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo, PontoVivo, SkewTexto } from "@/components/marca";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { getDicionario } from "@/lib/i18n/server";
import { cadastrar, entrar } from "./actions";

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; modo?: string }>;
}) {
  if (!supabaseConfigurado()) redirect("/");
  const { next = "/", erro, modo } = await searchParams;
  const cadastro = modo === "cadastro";
  const dic = await getDicionario();
  const de = dic.admin.entrar;

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
            {de.areaOrganizador}
          </div>
          <h1 className="disp max-w-[520px] text-[clamp(56px,6vw,96px)]">
            {de.heroTitulo} <span className="text-brand">{de.heroAccent}</span>.
          </h1>
          <p className="mt-[18px] max-w-[420px] text-[17px] font-medium leading-normal text-text-2">
            {de.heroDesc}
          </p>
        </div>

        <div className="relative font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          © {new Date().getFullYear()} · {dic.rodape}
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="flex items-center justify-center p-11 px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="disp mb-1 text-[56px]">
            {cadastro ? de.criarConta : de.entrar}
          </div>
          <p className="mb-[34px] text-[15px] font-medium text-muted-2">
            {cadastro ? de.subCriar : de.subEntrar}
          </p>

          {erro && (
            <p className="mb-5 border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          <form
            action={cadastro ? cadastrar : entrar}
            className="flex flex-col gap-5"
          >
            <input type="hidden" name="next" value={next} />
            {cadastro && (
              <div className="flex flex-col gap-[9px]">
                <label className={labelCls} htmlFor="login-nome">
                  {de.nomeCompleto}
                </label>
                <Input id="login-nome" name="nome" required className="h-12" />
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
                {de.senha} {cadastro && de.senhaMin}
              </label>
              <Input
                id="login-senha"
                name="senha"
                type="password"
                required
                minLength={cadastro ? 6 : undefined}
                placeholder="••••••••"
                className="h-12"
              />
            </div>

            <BotaoAcaoBruto className="mt-2 flex h-[52px] -skew-x-9 items-center justify-center bg-brand font-cond text-xl font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
              <SkewTexto>{cadastro ? de.criarContaBtn : de.entrarBtn}</SkewTexto>
            </BotaoAcaoBruto>
          </form>

          <div className="my-6 flex items-center gap-3.5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-cond text-[13px] uppercase tracking-[0.1em] text-muted-3">
              {de.ou}
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="text-center text-sm font-medium text-muted-2">
            {cadastro ? (
              <>
                {de.jaTemConta}{" "}
                <Link
                  href={`/entrar?next=${encodeURIComponent(next)}`}
                  className="font-semibold text-brand hover:text-foreground"
                >
                  {de.entrar}
                </Link>
              </>
            ) : (
              <>
                {de.aindaNaoTemConta}{" "}
                <Link
                  href={`/entrar?modo=cadastro&next=${encodeURIComponent(next)}`}
                  className="font-semibold text-brand hover:text-foreground"
                >
                  {de.criarContaOrg}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
