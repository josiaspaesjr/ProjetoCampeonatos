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

/**
 * Cadastro pendente: quem se inscreve sem estar logado tem a conta criada em
 * `usuarios` (sem authId) e a inscrição gravada na hora — não faz sentido
 * mandar para o login e jogar fora tudo o que ele acabou de preencher. Este
 * cookie curto liga essa pessoa à conta recém-criada até ela escolher a senha
 * em /criar-senha, que é o passo seguinte imediato.
 *
 * É httpOnly e vale 1 hora: não é sessão, é um bilhete de uma etapa só.
 */
const COOKIE_CADASTRO = "leaguemat_cadastro_pendente";

export async function definirCadastroPendente(usuarioId: string) {
  const jar = await cookies();
  jar.set(COOKIE_CADASTRO, usuarioId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
}

export async function getCadastroPendente(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_CADASTRO)?.value ?? null;
}

export async function limparCadastroPendente() {
  const jar = await cookies();
  jar.delete(COOKIE_CADASTRO);
}
