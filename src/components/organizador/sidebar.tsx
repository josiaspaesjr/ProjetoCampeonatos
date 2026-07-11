"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNavMobile } from "@/components/organizador/nav-mobile-context";

/** valor sentinela da opção "criar novo evento" no seletor de evento ativo */
const NOVO_EVENTO = "__novo__";

export interface EventoSwitcher {
  id: string;
  nome: string;
  dataCurta: string;
}

export interface ItemNav {
  id: string;
  rotulo: string;
  icone: string;
  href: string;
  badge?: string;
}

/**
 * Sidebar do console do organizador (248px, seletor de evento + menu).
 * No desktop fica fixa (sticky); abaixo de `lg` vira um drawer off-canvas
 * controlado pelo botão hambúrguer da topbar (via NavMobileContext).
 */
export function SidebarOrganizador({
  eventoId,
  eventos,
  itens,
}: {
  eventoId: string;
  eventos: EventoSwitcher[];
  itens: ItemNav[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { aberto, setAberto } = useNavMobile();
  const ativo = eventos.find((e) => e.id === eventoId);
  const fechar = () => setAberto(false);

  const conteudo = (
    <>
      {/* seletor de evento ativo */}
      <div className="border-b border-white/6 px-[18px] py-4">
        <div className="mb-2 font-cond text-[11px] uppercase tracking-[0.14em] text-muted-3">
          Evento ativo
        </div>
        <div className="relative">
          <select
            value={eventoId}
            onChange={(e) => {
              const v = e.target.value;
              fechar();
              router.push(
                v === NOVO_EVENTO
                  ? "/organizador/eventos/novo"
                  : `/organizador/eventos/${v}`,
              );
            }}
            className="w-full appearance-none border border-white/10 bg-raised px-[13px] py-2.5 pr-8 font-cond text-[17px] font-semibold uppercase text-foreground focus:border-brand focus:outline-none"
          >
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
            <option disabled>──────────</option>
            <option value={NOVO_EVENTO}>+ Novo evento</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-3">
            ▾
          </span>
        </div>
        {ativo && (
          <div className="tnum mt-1.5 font-cond text-xs uppercase tracking-[0.04em] text-muted-3">
            {ativo.dataCurta}
          </div>
        )}
        <Link
          href="/organizador/eventos/novo"
          onClick={fechar}
          className="mt-2.5 flex items-center gap-1.5 font-cond text-xs font-semibold uppercase tracking-[0.06em] text-brand transition-colors hover:text-brand-soft"
        >
          + Criar novo evento
        </Link>
      </div>

      {/* menu */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 px-3">
        {itens.map((n) => {
          const on =
            n.id === "overview"
              ? pathname === n.href
              : pathname.startsWith(n.href);
          return (
            <Link
              key={n.id}
              href={n.href}
              onClick={fechar}
              className={cn(
                "flex items-center gap-3 border-l-[3px] px-[13px] py-[11px] font-cond text-base font-semibold uppercase tracking-[0.03em] transition-colors",
                on
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-transparent text-muted-2 hover:text-foreground",
              )}
            >
              <span className="w-[18px] text-center text-[15px]">{n.icone}</span>
              <span className="flex-1">{n.rotulo}</span>
              {n.badge && (
                <span
                  className={cn(
                    "tnum font-sans text-xs font-semibold",
                    on ? "text-brand-soft" : "text-muted-3",
                  )}
                >
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/6 px-[18px] py-3.5">
        <Link
          href="/organizador"
          onClick={fechar}
          className="font-cond text-xs uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
        >
          ← Todos os meus eventos
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* desktop: sidebar fixa */}
      <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] flex-col self-start border-r border-white/8 bg-ink lg:flex">
        {conteudo}
      </aside>

      {/* mobile: drawer off-canvas */}
      {aberto && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={fechar}
            className="fixed inset-0 z-[90] cursor-default bg-black/60 animate-[fade-in_0.2s_ease]"
          />
          <aside className="fixed left-0 top-0 z-[91] flex h-screen w-[min(300px,86vw)] flex-col border-r border-white/10 bg-ink animate-[drawer-in-left_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between border-b border-white/8 px-[18px] py-3">
              <span className="disp text-[22px]">
                BJJ<span className="text-brand">ARENA</span>
              </span>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center border border-white/16 text-lg text-foreground transition-colors hover:border-white/35"
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{conteudo}</div>
          </aside>
        </div>
      )}
    </>
  );
}
