import type { Metadata } from "next";
import { eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, inscricoes } from "@/db/schema";
import { buscarBracketVivo } from "@/lib/bracket-vivo";
import { calcularRankingGeral } from "@/lib/ranking";
import { propsDoMenu } from "@/lib/menu-usuario";
import { perfilDeAcesso } from "@/lib/perfil-acesso";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { AvisoPendencias } from "@/components/aviso-pendencias";
import { LandingClient } from "./landing-client";

export const metadata: Metadata = { title: "A plataforma" };

// stats e chave ao vivo vêm do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

export default async function Plataforma() {
  const db = await getDb();

  const [todosEventos, confirmadas, ranking, bracket, perfil] = await Promise.all([
    db.query.eventos.findMany({ where: ne(eventos.status, "rascunho") }),
    db.query.inscricoes.findMany({
      where: eq(inscricoes.status, "confirmada"),
    }),
    calcularRankingGeral(db),
    buscarBracketVivo(),
    perfilDeAcesso(),
  ]);

  const menu = propsDoMenu(perfil, supabaseConfigurado());

  const totalAtletas = new Set(confirmadas.map((i) => i.usuarioId)).size;
  const totalEquipes = new Set(
    confirmadas.map((i) => i.academiaNome).filter(Boolean),
  ).size;

  const stats = [
    { valor: String(todosEventos.length), destaque: false },
    { valor: String(totalAtletas), destaque: false },
    { valor: String(totalEquipes), destaque: true },
    { valor: String(confirmadas.length), destaque: false },
  ];

  return (
    <>
      <AvisoPendencias />
      <LandingClient stats={stats} ranking={ranking} bracket={bracket} menu={menu} />
    </>
  );
}
