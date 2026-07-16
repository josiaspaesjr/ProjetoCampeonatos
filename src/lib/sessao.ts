import { cookies } from "next/headers";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Sessão do atleta.
 *
 * Com Supabase configurado, delega ao resolvedor único (login real).
 * Sem Supabase (dev com PGlite), usa o cookie simples que permite alternar
 * de atleta pelo formulário de inscrição.
 */
const COOKIE_DEV = "leaguemat_uid";

export async function getAtletaAtual() {
  return getUsuarioSessao();
}

/** no modo dev, troca o atleta da sessão; com Supabase é no-op (login real) */
export async function definirSessaoAtleta(usuarioId: string) {
  if (supabaseConfigurado()) return;
  const jar = await cookies();
  jar.set(COOKIE_DEV, usuarioId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
