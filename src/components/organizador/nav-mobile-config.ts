/**
 * Cookie da preferência de sidebar recolhida (desktop) do console do evento.
 *
 * Fica num módulo plano (sem "use client") para o servidor (layout do console)
 * e o cliente (NavMobileProvider) compartilharem o mesmo nome — mesmo padrão
 * do cookie de idioma em `src/lib/i18n/config.ts`. É lido no servidor para
 * semear o estado inicial sem flash/mismatch e gravado no cliente ao recolher.
 */
export const COOKIE_SIDEBAR = "leaguemat_sidebar";
