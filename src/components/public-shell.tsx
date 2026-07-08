import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioSessao();
  const comAuth = supabaseConfigurado();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-bold tracking-tight">
            BJJCAMP
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/minhas-inscricoes" className="text-zinc-500 hover:text-zinc-900">
              Minhas inscrições
            </Link>
            {comAuth &&
              (usuario ? (
                <form action={sair} className="flex items-center gap-3">
                  <span className="text-zinc-700">{usuario.nome}</span>
                  <button className="text-zinc-400 hover:text-zinc-900">sair</button>
                </form>
              ) : (
                <Link
                  href="/entrar"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700"
                >
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
