"use client";

import { useState } from "react";
import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { SkewTexto } from "@/components/marca";
import { AcaoTexto } from "@/components/ui/botao-acao";
import { SeletorIdioma, useDic } from "@/lib/i18n/client";

/**
 * Navegação do shell público. No desktop os links ficam inline; no mobile
 * colapsam num menu (hambúrguer) que abre logo abaixo do header — sem isso a
 * barra estoura a viewport quando há usuário logado (Eventos · Minhas
 * inscrições · nome · sair · Minha área).
 */
export function PublicNav({
  usuarioNome,
  comAuth,
}: {
  usuarioNome: string | null;
  comAuth: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  const dic = useDic();

  const links = (
    <>
      <Link
        href="/eventos"
        onClick={fechar}
        className="transition-colors hover:text-brand"
      >
        {dic.nav.eventos}
      </Link>
      <Link
        href="/minhas-inscricoes"
        onClick={fechar}
        className="text-muted-2 transition-colors hover:text-brand"
      >
        {dic.nav.minhasInscricoes}
      </Link>
      {comAuth && usuarioNome && (
        <Link
          href="/atleta"
          onClick={fechar}
          className="text-muted-2 transition-colors hover:text-brand"
        >
          {dic.nav.minhaArea}
        </Link>
      )}
    </>
  );

  const auth = comAuth && (
    usuarioNome ? (
      <form action={sair} className="flex items-center gap-3">
        <span className="text-text-2">{usuarioNome}</span>
        <AcaoTexto className="uppercase text-muted-2 transition-colors hover:text-foreground">
          {dic.nav.sair}
        </AcaoTexto>
      </form>
    ) : (
      <Link
        href="/acesso"
        onClick={fechar}
        className="-skew-x-9 bg-brand px-5 py-2 text-white"
      >
        <SkewTexto>{dic.nav.entrar}</SkewTexto>
      </Link>
    )
  );

  return (
    <>
      {/* desktop */}
      <nav className="hidden items-center gap-7 font-cond text-base font-semibold uppercase tracking-[0.04em] md:flex">
        {links}
        <SeletorIdioma />
        {auth}
      </nav>

      {/* mobile: botão hambúrguer */}
      <button
        type="button"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-white/14 transition-colors hover:border-white/30 md:hidden"
      >
        <span
          className={`block h-[2px] w-5 bg-foreground transition-transform ${aberto ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 bg-foreground transition-opacity ${aberto ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-[2px] w-5 bg-foreground transition-transform ${aberto ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {/* mobile: painel */}
      {aberto && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={fechar}
            className="fixed inset-0 top-[65px] z-40 cursor-default bg-black/60 md:hidden"
          />
          <nav className="absolute inset-x-0 top-full z-50 flex flex-col gap-4 border-b border-white/8 bg-ink px-6 py-6 font-cond text-lg font-semibold uppercase tracking-[0.04em] shadow-[0_12px_24px_rgba(0,0,0,0.5)] md:hidden">
            {links}
            <SeletorIdioma className="self-start" />
            {auth}
          </nav>
        </>
      )}
    </>
  );
}
