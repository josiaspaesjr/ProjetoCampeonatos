import { cookies } from "next/headers";
import { COOKIE_IDIOMA, LOCALE_PADRAO, ehLocale, type Locale } from "./config";
import { dicionarioDe, type Dicionario } from "./dicionarios";

/** Idioma atual (cookie), com fallback para pt. Lê os cookies do request. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(COOKIE_IDIOMA)?.value;
  return ehLocale(valor) ? valor : LOCALE_PADRAO;
}

/** Dicionário do idioma atual — para usar em Server Components. */
export async function getDicionario(): Promise<Dicionario> {
  return dicionarioDe(await getLocale());
}
