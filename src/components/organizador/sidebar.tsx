"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

/** Sidebar fixa do console do organizador (248px, seletor de evento + menu). */
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
  const ativo = eventos.find((e) => e.id === eventoId);

  return (
    <aside className="sticky top-[57px] flex h-[calc(100vh-57px)] flex-col self-start border-r border-white/8 bg-ink max-lg:hidden">
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
          className="font-cond text-xs uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
        >
          ← Todos os meus eventos
        </Link>
      </div>
    </aside>
  );
}
