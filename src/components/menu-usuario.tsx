"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { sair } from "@/app/entrar/actions";
import { SkewTexto } from "@/components/marca";
import { AcaoTexto } from "@/components/ui/botao-acao";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { SeletorIdioma, useDic } from "@/lib/i18n/client";
import type { PropsMenuUsuario } from "@/lib/menu-usuario";
import { cn } from "@/lib/utils";

/**
 * Indicador de usuário logado, único para todos os headers do sistema.
 *
 * - Deslogado (com auth): botão "Entrar" → /acesso.
 * - Logado: avatar (inicial do nome, borda na cor da faixa) que abre um menu
 *   com Minha área, Painel/Ativar organizador, Minhas inscrições, Ver o site e
 *   Sair. O item Sair só aparece com Supabase configurado (a action de logout
 *   depende dele).
 *
 * As props vêm prontas do servidor (propsDoMenu) — nunca a linha crua do banco.
 */
export function MenuUsuario({ usuario, ehOrganizador, comAuth }: PropsMenuUsuario) {
  const dic = useDic();
  const [aberto, setAberto] = useState(false);
  const idMenu = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // fecha ao clicar fora ou apertar Esc (Esc devolve o foco ao avatar)
  useEffect(() => {
    if (!aberto) return;
    function onPointer(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  // deslogado: só faz sentido oferecer login quando há auth de verdade
  if (!usuario) {
    if (!comAuth) return null;
    return (
      <Link
        href="/acesso"
        className="-skew-x-9 bg-brand px-5 py-2 text-white transition-colors hover:bg-[#d5261d]"
      >
        <SkewTexto>{dic.nav.entrar}</SkewTexto>
      </Link>
    );
  }

  const fechar = () => setAberto(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={idMenu}
        aria-label={dic.nav.minhaConta}
        className="flex h-10 w-10 shrink-0 -skew-x-9 items-center justify-center border-2 transition-transform hover:scale-[1.04]"
        style={{ borderColor: corDaFaixa(usuario.faixa) }}
      >
        <span className="skew-x-9 font-cond text-lg font-bold leading-none text-foreground">
          {usuario.inicial}
        </span>
      </button>

      {aberto && (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 top-full z-[60] mt-2 w-64 border border-white/12 bg-ink shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          {/* cabeçalho: quem está logado */}
          <div className="border-b border-white/8 px-4 py-3">
            <div className="truncate font-cond text-base font-semibold uppercase tracking-[0.04em] text-foreground">
              {usuario.nome}
            </div>
            <div className="truncate text-xs font-medium text-muted-3">
              {usuario.email}
            </div>
          </div>

          {/* atalhos */}
          <div className="py-1.5">
            <ItemMenu href="/atleta" onNavegar={fechar}>
              {dic.nav.minhaArea}
            </ItemMenu>
            <ItemMenu
              href={ehOrganizador ? "/organizador" : "/organizador/ativar"}
              onNavegar={fechar}
              destaque
            >
              {ehOrganizador ? dic.nav.painel : dic.nav.ativarOrganizador}
            </ItemMenu>
            <ItemMenu href="/minhas-inscricoes" onNavegar={fechar}>
              {dic.nav.minhasInscricoes}
            </ItemMenu>
            <ItemMenu href="/" onNavegar={fechar}>
              {dic.nav.verSite}
            </ItemMenu>
          </div>

          {/* idioma: aqui fica sempre acessível, inclusive no mobile onde o
              seletor inline do header some para a barra não estourar */}
          <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-2.5">
            <span className="font-cond text-xs uppercase tracking-[0.08em] text-muted-3">
              {dic.nav.idioma}
            </span>
            <SeletorIdioma />
          </div>

          {/* logout depende do Supabase; some no dev sem auth */}
          {comAuth && (
            <form action={sair} className="border-t border-white/8">
              <AcaoTexto
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left font-cond text-sm uppercase tracking-[0.06em] text-muted-2 transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                {dic.nav.sair}
              </AcaoTexto>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ItemMenu({
  href,
  children,
  onNavegar,
  destaque,
}: {
  href: string;
  children: React.ReactNode;
  onNavegar: () => void;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavegar}
      className={cn(
        "block px-4 py-2.5 font-cond text-sm uppercase tracking-[0.06em] transition-colors hover:bg-white/[0.04]",
        destaque
          ? "text-brand hover:text-brand"
          : "text-muted-2 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
