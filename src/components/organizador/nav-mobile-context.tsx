"use client";

import { createContext, useContext, useState } from "react";
import { COOKIE_SIDEBAR } from "@/components/organizador/nav-mobile-config";

/**
 * Estado compartilhado da navegação do console do evento.
 *
 * - `aberto`: drawer off-canvas no mobile (botão hambúrguer da topbar).
 * - `colapsado`: sidebar recolhida no desktop (botão de recolher da topbar),
 *   persistida em cookie (semeada pelo servidor).
 *
 * A topbar e a sidebar são irmãs no layout; este contexto liga as duas sem
 * precisar subir estado ao layout (que é server component).
 */
const NavMobileContext = createContext<{
  aberto: boolean;
  setAberto: (v: boolean) => void;
  colapsado: boolean;
  setColapsado: (v: boolean) => void;
}>({
  aberto: false,
  setAberto: () => {},
  colapsado: false,
  setColapsado: () => {},
});

export function NavMobileProvider({
  colapsadoInicial = false,
  children,
}: {
  colapsadoInicial?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [colapsado, definirColapsado] = useState(colapsadoInicial);

  const setColapsado = (v: boolean) => {
    definirColapsado(v);
    try {
      document.cookie = `${COOKIE_SIDEBAR}=${v ? "1" : "0"};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* cookie indisponível */
    }
  };

  return (
    <NavMobileContext.Provider
      value={{ aberto, setAberto, colapsado, setColapsado }}
    >
      {children}
    </NavMobileContext.Provider>
  );
}

export const useNavMobile = () => useContext(NavMobileContext);
