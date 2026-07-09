import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

export default async function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioSessao();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/organizador" className="font-bold tracking-tight">
            BJJArena{" "}
            <span className="font-normal text-muted-foreground">· Organizador</span>
          </Link>
          {supabaseConfigurado() && usuario ? (
            <form action={sair} className="flex items-center gap-3 text-sm">
              <span>{usuario.nome}</span>
              <button className="text-muted-foreground hover:text-foreground">
                sair
              </button>
            </form>
          ) : (
            <span className="text-sm text-muted-foreground">
              {usuario?.nome ?? "Organizador Dev"}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
