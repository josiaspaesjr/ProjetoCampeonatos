"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { getUsuarioSessao } from "@/lib/auth";

/**
 * Promoção explícita: transforma a conta logada em organizadora e leva ao
 * painel. Diferente do comportamento antigo, isto só roda quando o usuário
 * confirma na tela /organizador/ativar.
 */
export async function tornarOrganizador() {
  const usuario = await getUsuarioSessao();
  if (!usuario) redirect("/entrar?next=/organizador");

  if (!usuario.ehOrganizador) {
    const db = await getDb();
    await db
      .update(usuarios)
      .set({ ehOrganizador: true })
      .where(eq(usuarios.id, usuario.id));
  }
  redirect("/organizador");
}
