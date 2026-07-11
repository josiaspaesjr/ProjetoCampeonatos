"use client";

import { createContext, useContext, useState } from "react";

/**
 * Estado compartilhado do menu de navegação mobile do console do evento.
 * A topbar (botão hambúrguer) e a sidebar (drawer off-canvas) são irmãs no
 * layout; este contexto liga as duas sem precisar subir estado ao layout
 * (que é server component).
 */
const NavMobileContext = createContext<{
  aberto: boolean;
  setAberto: (v: boolean) => void;
}>({ aberto: false, setAberto: () => {} });

export function NavMobileProvider({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <NavMobileContext.Provider value={{ aberto, setAberto }}>
      {children}
    </NavMobileContext.Provider>
  );
}

export const useNavMobile = () => useContext(NavMobileContext);
