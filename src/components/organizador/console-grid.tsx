"use client";

import { cn } from "@/lib/utils";
import { useNavMobile } from "@/components/organizador/nav-mobile-context";

/**
 * Grade do console do evento (sidebar + conteúdo). É client porque a coluna
 * da sidebar depende do estado `colapsado` (recolher/expandir no desktop),
 * enquanto o layout que a usa é server component.
 */
export function ConsoleGrid({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colapsado } = useNavMobile();
  return (
    <div
      className={cn(
        "grid min-h-[calc(100vh-57px)] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        colapsado
          ? "lg:grid-cols-[0px_minmax(0,1fr)]"
          : "lg:grid-cols-[248px_minmax(0,1fr)]",
      )}
    >
      {sidebar}
      {children}
    </div>
  );
}
