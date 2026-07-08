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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/organizador" className="font-bold tracking-tight">
            BJJCAMP <span className="font-normal text-zinc-500">· Organizador</span>
          </Link>
          {supabaseConfigurado() && usuario ? (
            <form action={sair} className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600">{usuario.nome}</span>
              <button className="text-zinc-400 hover:text-zinc-900">sair</button>
            </form>
          ) : (
            <span className="text-sm text-zinc-500">
              {usuario?.nome ?? "Organizador Dev"}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
