import Link from "next/link";
import { MarcaBloco } from "@/components/marca";
import { MenuUsuarioServer } from "@/components/menu-usuario-server";
import { getDicionario } from "@/lib/i18n/server";

export default async function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <MenuUsuarioServer />
        </div>
      </header>
      <main className="w-full">{children}</main>
    </div>
  );
}
