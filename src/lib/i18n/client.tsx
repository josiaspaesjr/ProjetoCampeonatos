"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { COOKIE_IDIOMA, IDIOMAS, type Locale } from "./config";
import { DICIONARIOS, type Dicionario } from "./dicionarios";

interface CtxIdioma {
  locale: Locale;
  dic: Dicionario;
  trocar: (l: Locale) => void;
}

const IdiomaContext = createContext<CtxIdioma | null>(null);

/**
 * Provider de idioma. Semeado com o locale lido do cookie no servidor (root
 * layout), para não haver mismatch de hidratação. Ao trocar: atualiza o estado
 * (client re-renderiza na hora), grava o cookie e dá `router.refresh()` para os
 * Server Components virem no novo idioma. O cookie (1 ano) persiste a escolha.
 */
export function IdiomaProvider({
  locale: inicial,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(inicial);

  const trocar = (l: Locale) => {
    setLocale(l);
    try {
      document.cookie = `${COOKIE_IDIOMA}=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* cookie indisponível */
    }
    router.refresh();
  };

  return (
    <IdiomaContext.Provider value={{ locale, dic: DICIONARIOS[locale], trocar }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma(): CtxIdioma {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma precisa do IdiomaProvider");
  return ctx;
}

/** Dicionário do idioma atual — para Client Components. */
export function useDic(): Dicionario {
  return useIdioma().dic;
}

/** Seletor PT/EN/ES — troca o idioma de todo o sistema. */
export function SeletorIdioma({ className }: { className?: string }) {
  const { locale, trocar } = useIdioma();
  return (
    <div className={cn("flex items-center border border-white/16", className)}>
      {IDIOMAS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => trocar(l.id)}
          aria-label={l.nome}
          aria-pressed={locale === l.id}
          className={cn(
            "cursor-pointer px-2.5 py-1.5 font-cond text-xs font-bold tracking-[0.06em] transition-colors",
            locale === l.id
              ? "bg-brand text-white"
              : "text-muted-2 hover:text-foreground",
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
