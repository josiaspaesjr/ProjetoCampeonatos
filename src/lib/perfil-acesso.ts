import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes, usuarios } from "@/db/schema";
import { getUsuarioSessao } from "@/lib/auth";

type Usuario = typeof usuarios.$inferSelect;

export interface PerfilAcesso {
  usuario: Usuario;
  /** tem flag de organizador OU já criou algum evento */
  ehOrganizador: boolean;
  /** já se inscreveu em algum campeonato */
  ehAtleta: boolean;
}

/**
 * Descobre quais acessos o usuário logado possui, SEM promover ninguém
 * (diferente de getOrganizadorAtual, que ativa a flag ao entrar no painel).
 * Retorna null se não há sessão.
 */
export async function perfilDeAcesso(): Promise<PerfilAcesso | null> {
  const usuario = await getUsuarioSessao();
  if (!usuario) return null;

  const db = await getDb();
  const [meusEventos, minhasInscricoes] = await Promise.all([
    db.query.eventos.findFirst({
      where: eq(eventos.organizadorId, usuario.id),
      columns: { id: true },
    }),
    db.query.inscricoes.findFirst({
      where: eq(inscricoes.usuarioId, usuario.id),
      columns: { id: true },
    }),
  ]);

  return {
    usuario,
    ehOrganizador: usuario.ehOrganizador || !!meusEventos,
    ehAtleta: !!minhasInscricoes,
  };
}
