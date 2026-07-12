import type { Locale } from "../config";
import { pt, type Dicionario } from "./pt";
import { en } from "./en";
import { es } from "./es";

export type { Dicionario };

export const DICIONARIOS: Record<Locale, Dicionario> = { pt, en, es };

export function dicionarioDe(locale: Locale): Dicionario {
  return DICIONARIOS[locale];
}
