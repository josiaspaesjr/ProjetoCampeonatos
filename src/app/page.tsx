import { eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";
import { calcularRankingGeral } from "@/lib/ranking";
import { AvisoPendencias } from "@/components/aviso-pendencias";
import {
  LandingClient,
  type BracketVivo,
  type LadoBracket,
} from "./landing-client";

// stats e chave ao vivo vêm do banco — nunca servir versão estática
export const dynamic = "force-dynamic";

const BRACKET_DEMO: BracketVivo = {
  demo: true,
  titulo: "Adulto · Faixa-Preta · -76kg",
  esquerda: [
    { nome: "R. Mendes", placar: "6", venceu: true },
    { nome: "L. Costa", placar: "2", venceu: false },
  ],
  direita: [
    { nome: "T. Almeida", placar: "4", venceu: false },
    { nome: "B. Rocha", placar: "11", venceu: true },
  ],
  href: "/eventos",
};

async function buscarBracketVivo(): Promise<BracketVivo> {
  const db = await getDb();
  const emAndamento = await db.query.chaves.findFirst({
    where: eq(chaves.status, "em_andamento"),
  });
  if (!emAndamento) return BRACKET_DEMO;

  const [cat, linhas] = await Promise.all([
    db.query.categorias.findFirst({
      where: eq(categorias.id, emAndamento.categoriaId),
    }),
    db.query.lutas.findMany({ where: eq(lutas.chaveId, emAndamento.id) }),
  ]);
  if (!cat || linhas.length === 0) return BRACKET_DEMO;

  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.id, cat.eventoId),
  });

  // duas lutas mais recentes com os dois atletas definidos
  const candidatas = linhas
    .filter((l) => l.atleta1InscricaoId && l.atleta2InscricaoId)
    .sort((a, b) => b.rodada - a.rodada || a.posicao - b.posicao)
    .slice(0, 2);
  if (candidatas.length < 2) return BRACKET_DEMO;

  const ids = candidatas.flatMap((l) => [
    l.atleta1InscricaoId!,
    l.atleta2InscricaoId!,
  ]);
  const atletas = await db.query.inscricoes.findMany({
    where: inArray(inscricoes.id, ids),
  });
  const nomePorId = new Map(atletas.map((a) => [a.id, a.nomeAtleta]));
  const abreviar = (nome: string) => {
    const partes = nome.trim().split(/\s+/);
    return partes.length > 1
      ? `${partes[0][0]}. ${partes[partes.length - 1]}`
      : nome;
  };

  const lado = (l: (typeof candidatas)[number]): LadoBracket[] => [
    {
      nome: abreviar(nomePorId.get(l.atleta1InscricaoId!) ?? "Atleta"),
      placar: String(l.pontos1),
      venceu: l.vencedorInscricaoId === l.atleta1InscricaoId,
    },
    {
      nome: abreviar(nomePorId.get(l.atleta2InscricaoId!) ?? "Atleta"),
      placar: String(l.pontos2),
      venceu: l.vencedorInscricaoId === l.atleta2InscricaoId,
    },
  ];

  return {
    demo: false,
    titulo: cat.nome,
    esquerda: lado(candidatas[0]),
    direita: lado(candidatas[1]),
    href: evento ? `/evento/${evento.slug}/chaves/${cat.id}` : "/eventos",
  };
}

export default async function Home() {
  const db = await getDb();

  const [todosEventos, confirmadas, ranking, bracket] = await Promise.all([
    db.query.eventos.findMany({ where: ne(eventos.status, "rascunho") }),
    db.query.inscricoes.findMany({
      where: eq(inscricoes.status, "confirmada"),
    }),
    calcularRankingGeral(db),
    buscarBracketVivo(),
  ]);

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
      <LandingClient stats={stats} ranking={ranking} bracket={bracket} />
    </>
  );
}
