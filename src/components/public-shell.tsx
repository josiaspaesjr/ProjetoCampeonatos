import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { buttonVariants } from "@/components/ui/button";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioSessao();
  const comAuth = supabaseConfigurado();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-bold tracking-tight">
            BJJCAMP
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/minhas-inscricoes"
              className="text-muted-foreground hover:text-foreground"
            >
              Minhas inscrições
            </Link>
            {comAuth &&
              (usuario ? (
                <form action={sair} className="flex items-center gap-3">
                  <span>{usuario.nome}</span>
                  <button className="text-muted-foreground hover:text-foreground">
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
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
