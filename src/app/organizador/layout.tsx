import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { MarcaBloco } from "@/components/marca";
import { AcaoTexto } from "@/components/ui/botao-acao";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { getDicionario } from "@/lib/i18n/server";

export default async function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioSessao();
  const da = (await getDicionario()).admin;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3.5 md:px-10">
          <Link href="/organizador" className="flex items-center gap-2.5">
            <MarcaBloco tamanho={32} />
            <span className="disp text-[28px]">
              League<span className="text-brand">Mat</span>
            </span>
            <span className="ml-1.5 hidden font-cond text-[15px] uppercase tracking-[0.1em] text-muted-3 sm:inline">
              / {da.organizador}
            </span>
          </Link>
          {supabaseConfigurado() && usuario ? (
            <form
              action={sair}
              className="flex items-center gap-5 font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2"
            >
              <span>{usuario.nome}</span>
              <AcaoTexto className="uppercase transition-colors hover:text-foreground">
                {da.sair}
              </AcaoTexto>
            </form>
          ) : (
            <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
              {usuario?.nome ?? da.orgDev}
            </span>
          )}
        </div>
      </header>
      <main className="w-full">{children}</main>
    </div>
  );
}
