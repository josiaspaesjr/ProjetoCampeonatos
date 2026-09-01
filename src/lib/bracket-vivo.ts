import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";

export interface LadoBracket {
  nome: string;
  placar: string;
  venceu: boolean;
}

export interface BracketVivo {
  demo: boolean;
  titulo: string;
  esquerda: LadoBracket[];
  direita: LadoBracket[];
  href: string;
}

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
  href: "/",
};

/**
 * Duas lutas de uma chave em andamento, para o card "ao vivo". Sem chave
 * rolando (ou sem lutas com os dois atletas definidos) devolve a demo — a
 * vitrine nunca fica com um buraco.
 */
export async function buscarBracketVivo(): Promise<BracketVivo> {
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
    href: evento ? `/evento/${evento.slug}/chaves/${cat.id}` : "/",
  };
}
