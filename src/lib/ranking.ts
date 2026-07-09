import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";

/**
 * Ranking geral do circuito, calculado dos pódios das chaves concluídas.
 * Pontuação por categoria no padrão IBJJF: ouro 9, prata 3, bronze 1.
 */

export interface LinhaRanking {
  nome: string;
  equipe: string;
  faixa: string;
  pontos: number;
}

export interface RankingGeral {
  adulto: LinhaRanking[];
  master: LinhaRanking[];
  feminino: LinhaRanking[];
}

const PONTOS = { ouro: 9, prata: 3, bronze: 1 };

export async function calcularRankingGeral(
  db: Db,
  limite = 6,
): Promise<RankingGeral> {
  const vazio: RankingGeral = { adulto: [], master: [], feminino: [] };

  const concluidas = await db.query.chaves.findMany({
    where: eq(chaves.status, "concluida"),
  });
  if (!concluidas.length) return vazio;

  const [cats, linhasLutas] = await Promise.all([
    db.query.categorias.findMany({
      where: inArray(categorias.id, concluidas.map((c) => c.categoriaId)),
    }),
    db.query.lutas.findMany({
      where: inArray(lutas.chaveId, concluidas.map((c) => c.id)),
    }),
  ]);
  const catPorId = new Map(cats.map((c) => [c.id, c]));

  const lutasPorChave = new Map<string, (typeof linhasLutas)[number][]>();
  for (const l of linhasLutas) {
    const grupo = lutasPorChave.get(l.chaveId) ?? [];
    grupo.push(l);
    lutasPorChave.set(l.chaveId, grupo);
  }

  // pontos por inscrição, com a categoria de origem (para separar as abas)
  const premios: { inscricaoId: string; pontos: number; categoriaId: string }[] = [];
  for (const chave of concluidas) {
    const linhas = lutasPorChave.get(chave.id);
    if (!linhas?.length) continue;
    const podio = calcularPodioDaChave(chave, linhas);
    if (podio.primeiro) {
      premios.push({
        inscricaoId: podio.primeiro,
        pontos: PONTOS.ouro,
        categoriaId: chave.categoriaId,
      });
    }
    if (podio.segundo) {
      premios.push({
        inscricaoId: podio.segundo,
        pontos: PONTOS.prata,
        categoriaId: chave.categoriaId,
      });
    }
    for (const terceiro of podio.terceiros) {
      premios.push({
        inscricaoId: terceiro,
        pontos: PONTOS.bronze,
        categoriaId: chave.categoriaId,
      });
    }
  }
  if (!premios.length) return vazio;

  const inscritos = await db.query.inscricoes.findMany({
    where: inArray(inscricoes.id, [...new Set(premios.map((p) => p.inscricaoId))]),
  });
  const inscricaoPorId = new Map(inscritos.map((i) => [i.id, i]));

  const abas: Record<keyof RankingGeral, Map<string, LinhaRanking>> = {
    adulto: new Map(),
    master: new Map(),
    feminino: new Map(),
  };

  const somar = (aba: Map<string, LinhaRanking>, premio: (typeof premios)[number]) => {
    const insc = inscricaoPorId.get(premio.inscricaoId);
    if (!insc) return;
    const atual = aba.get(insc.usuarioId);
    if (atual) {
      atual.pontos += premio.pontos;
    } else {
      aba.set(insc.usuarioId, {
        nome: insc.nomeAtleta,
        equipe: insc.academiaNome ?? "Sem equipe",
        faixa: insc.faixa,
        pontos: premio.pontos,
      });
    }
  };

  for (const premio of premios) {
    const cat = catPorId.get(premio.categoriaId);
    if (!cat) continue;
    if (cat.classeIdade === "adulto") somar(abas.adulto, premio);
    if (cat.classeIdade.startsWith("master")) somar(abas.master, premio);
    if (cat.sexo === "feminino") somar(abas.feminino, premio);
  }

  const ordenar = (aba: Map<string, LinhaRanking>) =>
    [...aba.values()].sort((a, b) => b.pontos - a.pontos).slice(0, limite);

  return {
    adulto: ordenar(abas.adulto),
    master: ordenar(abas.master),
    feminino: ordenar(abas.feminino),
  };
}
