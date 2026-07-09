import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { MarcaBloco } from "@/components/marca";
import { AcaoTexto } from "@/components/ui/botao-acao";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

export default async function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioSessao();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3.5 md:px-10">
          <Link href="/organizador" className="flex items-center gap-2.5">
            <MarcaBloco tamanho={32} />
            <span className="disp text-[28px]">
              BJJ<span className="text-brand">ARENA</span>
            </span>
            <span className="ml-1.5 font-cond text-[15px] uppercase tracking-[0.1em] text-muted-3">
              / Organizador
            </span>
          </Link>
          {supabaseConfigurado() && usuario ? (
            <form
              action={sair}
              className="flex items-center gap-5 font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2"
            >
              <span>{usuario.nome}</span>
              <AcaoTexto className="uppercase transition-colors hover:text-foreground">
                Sair
              </AcaoTexto>
            </form>
          ) : (
            <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
              {usuario?.nome ?? "Organizador Dev"}
            </span>
          )}
        </div>
      </header>
      <main className="w-full">{children}</main>
    </div>
  );
}
