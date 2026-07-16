/**
 * Configuração central de idioma (i18n) do LeagueMat.
 *
 * O idioma é global: guardado num cookie (`leaguemat_lang`) para os Server
 * Components lerem no servidor, e espelhado em localStorage para o seletor no
 * cliente trocar na hora. Ao trocar, o cliente grava o cookie e dá
 * `router.refresh()` para os componentes de servidor re-renderizarem no idioma.
 */

export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_PADRAO: Locale = "pt";

/** cookie (server) e chave de localStorage (client) compartilham o nome */
export const COOKIE_IDIOMA = "leaguemat_lang";

export const IDIOMAS: { id: Locale; code: string; nome: string }[] = [
  { id: "pt", code: "PT", nome: "Português" },
  { id: "en", code: "EN", nome: "English" },
  { id: "es", code: "ES", nome: "Español" },
];

export function ehLocale(x: string | undefined | null): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}
