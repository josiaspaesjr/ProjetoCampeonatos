import { desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { categorias, chaves, eventos, inscricoes, lutas } from "@/db/schema";
import { calcularPodioDaChave } from "@/lib/chaves/persistencia";

/**
 * Histórico competitivo de um atleta: cada inscrição confirmada vira uma
 * participação, com a colocação (quando a chave está concluída) e o cartel
 * (vitórias/derrotas) apurado das lutas.
 */

export type Colocacao = "ouro" | "prata" | "bronze" | "participante" | "pendente";

export interface Participacao {
  inscricaoId: string;
  eventoNome: string;
  eventoSlug: string;
  dataEvento: string;
  categoriaNome: string;
  faixa: string;
  statusInscricao: string;
  colocacao: Colocacao;
  vitorias: number;
  derrotas: number;
  totalLutas: number;
  /** link para a chave pública, quando publicada/concluída */
  chaveUrl: string | null;
}

export interface ResumoAtleta {
  campeonatos: number;
  lutas: number;
  vitorias: number;
  derrotas: number;
  ouros: number;
  pratas: number;
  bronzes: number;
  podios: number;
}

export interface HistoricoAtleta {
  participacoes: Participacao[];
  resumo: ResumoAtleta;
}

const RESUMO_VAZIO: ResumoAtleta = {
  campeonatos: 0,
  lutas: 0,
  vitorias: 0,
  derrotas: 0,
  ouros: 0,
  pratas: 0,
  bronzes: 0,
  podios: 0,
};

export async function historicoDoAtleta(
  db: Db,
  usuarioId: string,
): Promise<HistoricoAtleta> {
  const minhas = await db.query.inscricoes.findMany({
    where: eq(inscricoes.usuarioId, usuarioId),
    orderBy: desc(inscricoes.criadoEm),
  });
  if (!minhas.length) return { participacoes: [], resumo: RESUMO_VAZIO };

  const catIds = [...new Set(minhas.map((i) => i.categoriaId))];
  const evtIds = [...new Set(minhas.map((i) => i.eventoId))];

  const [cats, evts] = await Promise.all([
    db.query.categorias.findMany({ where: inArray(categorias.id, catIds) }),
    db.query.eventos.findMany({ where: inArray(eventos.id, evtIds) }),
  ]);
  const catPorId = new Map(cats.map((c) => [c.id, c]));
  const evtPorId = new Map(evts.map((e) => [e.id, e]));

  // chaves das categorias em que o atleta está inscrito (+ lutas de cada uma)
  const chavesDasCats = catIds.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, catIds),
      })
    : [];
  const chavePorCategoria = new Map(chavesDasCats.map((c) => [c.categoriaId, c]));

  const todasLutas = chavesDasCats.length
    ? await db.query.lutas.findMany({
        where: inArray(lutas.chaveId, chavesDasCats.map((c) => c.id)),
      })
    : [];
  const lutasPorChave = new Map<string, (typeof todasLutas)[number][]>();
  for (const l of todasLutas) {
    const grupo = lutasPorChave.get(l.chaveId) ?? [];
    grupo.push(l);
    lutasPorChave.set(l.chaveId, grupo);
  }

  const participacoes: Participacao[] = minhas.map((insc) => {
    const evento = evtPorId.get(insc.eventoId);
    const categoria = catPorId.get(insc.categoriaId);
    const chave = chavePorCategoria.get(insc.categoriaId);
    const linhas = chave ? (lutasPorChave.get(chave.id) ?? []) : [];

    // cartel: lutas em que o atleta apareceu e que já têm vencedor definido
    let vitorias = 0;
    let derrotas = 0;
    for (const l of linhas) {
      const participou =
        l.atleta1InscricaoId === insc.id || l.atleta2InscricaoId === insc.id;
      if (!participou || !l.vencedorInscricaoId) continue;
      if (l.vencedorInscricaoId === insc.id) vitorias++;
      else derrotas++;
    }

    let colocacao: Colocacao = "pendente";
    if (chave?.status === "concluida") {
      const podio = calcularPodioDaChave(chave, linhas);
      if (podio.primeiro === insc.id) colocacao = "ouro";
      else if (podio.segundo === insc.id) colocacao = "prata";
      else if (podio.terceiros.includes(insc.id)) colocacao = "bronze";
      else colocacao = "participante";
    } else if (chave) {
      colocacao = "pendente"; // chave gerada mas ainda em disputa
    } else {
      colocacao = "pendente"; // sem chave ainda
    }

    const chaveUrl =
      chave && chave.status !== "rascunho" && evento
        ? `/evento/${evento.slug}/chaves/${insc.categoriaId}`
        : null;

    return {
      inscricaoId: insc.id,
      eventoNome: evento?.nome ?? "Evento",
      eventoSlug: evento?.slug ?? "",
      dataEvento: evento?.dataInicio ?? "",
      categoriaNome: categoria?.nome ?? "Categoria",
      faixa: insc.faixa,
      statusInscricao: insc.status,
      colocacao,
      vitorias,
      derrotas,
      totalLutas: vitorias + derrotas,
      chaveUrl,
    };
  });

  const resumo = participacoes.reduce<ResumoAtleta>(
    (acc, p) => ({
      campeonatos: acc.campeonatos + 1,
      lutas: acc.lutas + p.totalLutas,
      vitorias: acc.vitorias + p.vitorias,
      derrotas: acc.derrotas + p.derrotas,
      ouros: acc.ouros + (p.colocacao === "ouro" ? 1 : 0),
      pratas: acc.pratas + (p.colocacao === "prata" ? 1 : 0),
      bronzes: acc.bronzes + (p.colocacao === "bronze" ? 1 : 0),
      podios:
        acc.podios +
        (["ouro", "prata", "bronze"].includes(p.colocacao) ? 1 : 0),
    }),
    { ...RESUMO_VAZIO },
  );

  return { participacoes, resumo };
}
