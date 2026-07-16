import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { criarClienteSupabase, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Resolvedor único de sessão.
 *
 * - Com Supabase configurado: sessão real (authId → linha em usuarios,
 *   vinculada por e-mail ou criada no primeiro acesso).
 * - Sem Supabase (dev com PGlite): cookie simples de desenvolvimento.
 */
const COOKIE_DEV = "leaguemat_uid";

export async function getUsuarioSessao() {
  const db = await getDb();

  if (supabaseConfigurado()) {
    const supabase = await criarClienteSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const porAuthId = await db.query.usuarios.findFirst({
      where: eq(usuarios.authId, user.id),
    });
    if (porAuthId) return porAuthId;

    // primeiro login: vincula conta pré-existente pelo e-mail ou cria
    const porEmail = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, user.email.toLowerCase()),
    });
    if (porEmail) {
      const [vinculado] = await db
        .update(usuarios)
        .set({ authId: user.id })
        .where(eq(usuarios.id, porEmail.id))
        .returning();
      return vinculado;
    }

    const [criado] = await db
      .insert(usuarios)
      .values({
        authId: user.id,
        email: user.email.toLowerCase(),
        nome:
          (user.user_metadata?.nome as string | undefined) ??
          user.email.split("@")[0],
      })
      .returning();
    return criado;
  }

  // --- modo dev sem Supabase ------------------------------------------------
  const jar = await cookies();
  const id = jar.get(COOKIE_DEV)?.value;
  if (!id) return null;
  return (
    (await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) })) ?? null
  );
}

/** guarda das páginas do organizador; no MVP qualquer conta logada pode organizar */
export async function getOrganizadorAtual() {
  if (supabaseConfigurado()) {
    const usuario = await getUsuarioSessao();
    if (!usuario) redirect("/entrar?next=/organizador");
    if (!usuario.ehOrganizador) {
      const db = await getDb();
      const [promovido] = await db
        .update(usuarios)
        .set({ ehOrganizador: true })
        .where(eq(usuarios.id, usuario.id))
        .returning();
      return promovido;
    }
    return usuario;
  }

  // dev: organizador fixo, criado sob demanda
  const db = await getDb();
  const EMAIL_DEV = "organizador@dev.local";
  const existente = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, EMAIL_DEV),
  });
  if (existente) return existente;
  const [criado] = await db
    .insert(usuarios)
    .values({ nome: "Organizador Dev", email: EMAIL_DEV, ehOrganizador: true })
    .returning();
  return criado;
}

/** mantém compatibilidade com chamadas existentes do painel */
export const getUsuarioAtual = getOrganizadorAtual;
