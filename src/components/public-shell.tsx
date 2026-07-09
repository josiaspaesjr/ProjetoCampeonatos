import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Logo } from "@/components/marca";
import { buttonVariants } from "@/components/ui/button";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

export async function PublicShell({
  children,
  largura = "max-w-4xl",
}: {
  children: React.ReactNode;
  largura?: string;
}) {
  const usuario = await getUsuarioSessao();
  const comAuth = supabaseConfigurado();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/7 bg-ink/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          <Logo tamanho={26} />
          <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-[0.1em]">
            <Link
              href="/minhas-inscricoes"
              className="text-muted-2 transition-colors hover:text-foreground"
            >
              Minhas inscrições
            </Link>
            {comAuth &&
              (usuario ? (
                <form action={sair} className="flex items-center gap-3">
                  <span className="text-text-2">{usuario.nome}</span>
                  <button className="uppercase text-muted-2 transition-colors hover:text-foreground">
                    sair
                  </button>
                </form>
              ) : (
                <Link href="/entrar" className={buttonVariants({ size: "sm" })}>
                  Entrar
                </Link>
              ))}
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full px-6 py-10 md:px-12 ${largura}`}>
        {children}
      </main>
    </div>
  );
}
