"use client";

import Link from "next/link";
import { MenuUsuario } from "@/components/menu-usuario";
import { SeletorIdioma, useDic } from "@/lib/i18n/client";
import type { PropsMenuUsuario } from "@/lib/menu-usuario";

/**
 * Navegação do shell público. Enxuta de propósito: um link contextual
 * (Eventos), o seletor de idioma e o menu de usuário (avatar → dropdown). As
 * antigas linhas "Minhas inscrições" e "Minha área" vivem agora dentro do
 * menu, então a barra cabe no mobile sem precisar de hambúrguer.
 */
export function PublicNav({ menu }: { menu: PropsMenuUsuario }) {
  const dic = useDic();

  return (
    <nav className="flex items-center gap-5 font-cond text-base font-semibold uppercase tracking-[0.04em] md:gap-6">
      <Link href="/eventos" className="max-sm:hidden transition-colors hover:text-brand">
        {dic.nav.eventos}
      </Link>
      <SeletorIdioma className="max-sm:hidden" />
      <MenuUsuario {...menu} />
    </nav>
  );
}
