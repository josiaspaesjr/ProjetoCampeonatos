import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/marca";
import { perfilDeAcesso } from "@/lib/perfil-acesso";
import { supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Roteador pós-login. Identifica o perfil e encaminha:
 * - só organizador → painel; só atleta → área do atleta;
 * - os dois (ou conta nova, sem nada ainda) → tela de escolha.
 */
export default async function Acesso() {
  const perfil = await perfilDeAcesso();

  if (!perfil) {
    // sem sessão: manda logar (em dev sem Supabase, /entrar cai na home)
    redirect(supabaseConfigurado() ? "/entrar?next=/acesso" : "/atleta");
  }

  const { usuario, ehOrganizador, ehAtleta } = perfil;

  if (ehOrganizador && !ehAtleta) redirect("/organizador");
  if (ehAtleta && !ehOrganizador) redirect("/atleta");

  // ambos, ou conta nova sem histórico → deixa o usuário escolher
  const primeiroNome = usuario.nome.split(/\s+/)[0];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/8 px-6 py-4 md:px-12">
        <Logo tamanho={30} />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16 md:px-12">
        <div className="mb-2 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
          Olá, {primeiroNome}
        </div>
        <h1 className="disp text-[clamp(44px,6vw,80px)]">
          Como quer entrar?
        </h1>
        <p className="mt-3 max-w-[520px] text-base font-medium text-muted-2">
          {ehOrganizador && ehAtleta
            ? "Sua conta tem os dois acessos. Escolha por onde começar — você troca quando quiser."
            : "Escolha o tipo de acesso. Você pode organizar campeonatos ou competir como atleta."}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* ATLETA */}
          <Link
            href="/atleta"
            className="group relative overflow-hidden border border-white/12 bg-surface p-8 transition-colors hover:border-brand/55"
          >
            <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
            <div className="font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
              Competir
            </div>
            <div className="disp mt-1 text-[44px]">Sou atleta</div>
            <p className="mt-2 text-[15px] font-medium leading-normal text-muted-2">
              Veja os campeonatos que você disputou, seus resultados, cartel e
              os QR de check-in das inscrições.
            </p>
            <div className="mt-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-brand">
              Entrar como atleta →
            </div>
          </Link>

          {/* ORGANIZADOR */}
          <Link
            href="/organizador"
            className="group relative overflow-hidden border border-white/12 bg-surface p-8 transition-colors hover:border-brand/55"
          >
            <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
            <div className="font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
              Gerir
            </div>
            <div className="disp mt-1 text-[44px]">Sou organizador</div>
            <p className="mt-2 text-[15px] font-medium leading-normal text-muted-2">
              Crie e publique eventos, gere chaves, faça o check-in e acompanhe
              inscrições e receita.
            </p>
            <div className="mt-6 font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-brand">
              Entrar como organizador →
            </div>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="font-cond text-sm uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
          >
            ← Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
