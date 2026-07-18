import { AvisoPendencias } from "@/components/aviso-pendencias";
import { Logo } from "@/components/marca";
import { PublicNav } from "@/components/public-nav";
import { propsDoMenu } from "@/lib/menu-usuario";
import { perfilDeAcesso } from "@/lib/perfil-acesso";
import { supabaseConfigurado } from "@/lib/supabase/server";

export async function PublicShell({
  children,
  largura = "max-w-4xl",
}: {
  children: React.ReactNode;
  largura?: string;
}) {
  const perfil = await perfilDeAcesso();
  const menu = propsDoMenu(perfil, supabaseConfigurado());

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-ink/90 backdrop-blur-xl">
        <div className="relative flex items-center justify-between px-6 py-4 md:px-12">
          <Logo tamanho={30} />
          <PublicNav menu={menu} />
        </div>
      </header>
      <AvisoPendencias />
      <main className={`mx-auto w-full px-6 py-10 md:px-12 ${largura}`}>
        {children}
      </main>
    </div>
  );
}
