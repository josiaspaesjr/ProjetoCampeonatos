import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { areas, categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { chaveDoGrupo, nomeDaClasse } from "@/lib/categorias/distribuicao-areas";
import { idsDeBye } from "@/lib/chaves/byes";
import { duracaoDaCategoria } from "./fila";

/**
 * Cronograma de lutas por área para a seção **Áreas** do organizador.
 *
 * Para cada área, devolve suas categorias (na ordem do dia — `ordemNaArea`) com
 * o horário previsto de início e a lista de lutas. O horário é ancorado no
 * **início do dia (09:00)** da data do evento e avança pela duração acumulada
 * das lutas anteriores **no mesmo tatame** (cada área corre em paralelo). Antes
 * das chaves existirem, mostra a lista de inscritos e estima o nº de lutas
 * (`atletas − 1`) só para manter o horário da coluna realista.
 *
 * Tudo é derivado do backend (áreas, categorias, chaves, lutas e inscrições
 * confirmadas). Rótulos já vêm formatados para o cliente permanecer burro.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROTULO_SEXO: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

const ROTULO_METODO: Record<string, string> = {
  pontos: "Pontos",
  vantagens: "Vantagens",
  finalizacao: "Finalização",
  decisao: "Decisão",
  wo: "W.O.",
  dq: "Desqualificação",
};

/** início do dia: 09:00 (segundos desde a meia-noite) */
const INICIO_DIA_SEGUNDOS = 9 * 3600;

/** "09:00" a partir de segundos desde a meia-noite */
function horaLabel(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${pad2(h)}:${pad2(m)}`;
}

/** "dd/mm" a partir da data do evento (string "YYYY-MM-DD" ou Date) */
function dataLabel(data: string | Date): string {
  if (typeof data === "string") {
    const [, mm, dd] = data.slice(0, 10).split("-");
    return dd && mm ? `${dd}/${mm}` : data;
  }
  return `${pad2(data.getUTCDate())}/${pad2(data.getUTCMonth() + 1)}`;
}

/** rótulo do peso: último segmento do nome ("… / Pena (até 70kg)") */
function rotuloPeso(nome: string, tipo: string): string {
  if (tipo === "absoluto") return "Absoluto";
  const partes = nome.split(" / ");
  return partes.length > 1 ? partes[partes.length - 1].trim() : nome;
}

/** uma luta na coluna da área */
export interface LutaCron {
  /** rótulo sequencial na categoria: "L1", "L2"… */
  label: string;
  /** horário previsto de início ("09:12") */
  hora: string;
  /** nome do atleta 1 (ou "A definir" quando o slot ainda não foi resolvido) */
  a1: string;
  a2: string;
  /** pontos do placar (0 quando a luta ainda não começou) */
  score1: number;
  score2: number;
  /** vantagens do placar */
  vantagens1: number;
  vantagens2: number;
  /** punições do placar */
  punicoes1: number;
  punicoes2: number;
  /** vencedor: 1 = atleta 1, 2 = atleta 2, 0 = indefinido */
  vencedor: 0 | 1 | 2;
  /** true quando a luta já tem vencedor */
  decidida: boolean;
  /** método da vitória já formatado ("Finalização", "Pontos"…) ou null */
  metodo: string | null;
  /** nome da finalização quando houver ("Armlock") ou null */
  finalizacao: string | null;
}

/** uma categoria (bloco) dentro da coluna da área */
export interface CategoriaCron {
  /** chave classe·sexo·faixa (para contar grupos distintos na área) */
  grupoChave: string;
  faixa: string | null;
  /** título forte: "Preta · Pena (até 70kg)" */
  titulo: string;
  /** subtítulo: "Adulto · Masculino · 6 atletas" */
  subtitulo: string;
  /** horário previsto de início da categoria */
  hora: string;
  /** nº de lutas (real quando há chave; estimado — atletas−1 — quando não) */
  nLutas: number;
  /** true quando a chave já foi gerada (há lutas de verdade) */
  chaveGerada: boolean;
  /** inscritos confirmados (para o roster quando a chave não foi gerada) */
  atletas: string[];
  /** lutas da categoria (vazio quando a chave não foi gerada) */
  lutas: LutaCron[];
}

/** uma coluna (área/tatame) do cronograma */
export interface AreaCron {
  id: string;
  nome: string;
  /** "dd/mm" da data do evento */
  dataLabel: string;
  /** janela do tatame: início e fim previstos */
  inicio: string;
  fim: string;
  totalCats: number;
  totalGrupos: number;
  categorias: CategoriaCron[];
}

/**
 * Monta o cronograma de todas as áreas do evento. Devolve `[]` quando não há
 * áreas estruturadas; colunas vazias quando há áreas mas nada alocado.
 */
export async function montarCronogramaDoEvento(
  db: Db,
  eventoId: string,
  dataInicio: string | Date,
): Promise<AreaCron[]> {
  const todasAreas = await db.query.areas.findMany({
    where: eq(areas.eventoId, eventoId),
    orderBy: asc(areas.ordem),
  });
  if (!todasAreas.length) return [];

  const dia = dataLabel(dataInicio);
  const inicioDia = horaLabel(INICIO_DIA_SEGUNDOS);
  const areaIds = new Set(todasAreas.map((a) => a.id));

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
  });
  const catsAlocadas = cats.filter((c) => c.areaId && areaIds.has(c.areaId));

  // sem alocação: colunas vazias (áreas existem, distribuição ainda não corada)
  if (!catsAlocadas.length) {
    return todasAreas.map((a) => ({
      id: a.id,
      nome: a.nome,
      dataLabel: dia,
      inicio: inicioDia,
      fim: inicioDia,
      totalCats: 0,
      totalGrupos: 0,
      categorias: [],
    }));
  }

  const catIds = catsAlocadas.map((c) => c.id);

  // chaves + lutas em lote (evita N+1 por categoria)
  const chavesRows = await db.query.chaves.findMany({
    where: inArray(chaves.categoriaId, catIds),
  });
  const chavePorCat = new Map(chavesRows.map((ch) => [ch.categoriaId, ch]));
  const chaveIds = chavesRows.map((ch) => ch.id);
  const lutasRows = chaveIds.length
    ? await db.query.lutas.findMany({
        where: inArray(lutas.chaveId, chaveIds),
        orderBy: [asc(lutas.rodada), asc(lutas.posicao)],
      })
    : [];
  const lutasPorChave = new Map<string, typeof lutasRows>();
  for (const l of lutasRows) {
    const arr = lutasPorChave.get(l.chaveId);
    if (arr) arr.push(l);
    else lutasPorChave.set(l.chaveId, [l]);
  }

  // inscrições confirmadas → nome por inscrição + roster por categoria
  const confirmadas = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.eventoId, eventoId),
      eq(inscricoes.status, "confirmada"),
    ),
  });
  const nomePorInscricao = new Map(confirmadas.map((i) => [i.id, i.nomeAtleta]));
  const inscritosPorCat = new Map<string, string[]>();
  for (const i of confirmadas) {
    const arr = inscritosPorCat.get(i.categoriaId);
    if (arr) arr.push(i.nomeAtleta);
    else inscritosPorCat.set(i.categoriaId, [i.nomeAtleta]);
  }

  // categorias por área, na ordem do dia (ordemNaArea)
  const catsPorArea = new Map<string, typeof catsAlocadas>();
  for (const c of catsAlocadas) {
    const arr = catsPorArea.get(c.areaId!);
    if (arr) arr.push(c);
    else catsPorArea.set(c.areaId!, [c]);
  }
  for (const arr of catsPorArea.values()) {
    arr.sort((a, b) => (a.ordemNaArea ?? 0) - (b.ordemNaArea ?? 0));
  }

  return todasAreas.map((area) => {
    const catsDaArea = catsPorArea.get(area.id) ?? [];
    const gruposVistos = new Set<string>();
    let cursor = INICIO_DIA_SEGUNDOS;

    const categoriasCron: CategoriaCron[] = catsDaArea.map((c) => {
      const dur = duracaoDaCategoria(c);
      const atletas = inscritosPorCat.get(c.id) ?? [];
      const nAtletas = atletas.length;
      const grupoChave = chaveDoGrupo(c);
      gruposVistos.add(grupoChave);

      const chave = chavePorCat.get(c.id);
      const lutasDaChave = chave ? (lutasPorChave.get(chave.id) ?? []) : [];
      const byes = chave
        ? idsDeBye(lutasDaChave, chave.formato)
        : new Set<string>();
      const visiveis = lutasDaChave.filter((l) => !byes.has(l.id));
      const chaveGerada = visiveis.length > 0;

      const horaCategoria = horaLabel(cursor);
      let lutasCron: LutaCron[] = [];

      if (chaveGerada) {
        lutasCron = visiveis.map((l, k) => {
          const hora = horaLabel(cursor);
          cursor += dur;
          const a1 = l.atleta1InscricaoId
            ? (nomePorInscricao.get(l.atleta1InscricaoId) ?? "—")
            : "A definir";
          const a2 = l.atleta2InscricaoId
            ? (nomePorInscricao.get(l.atleta2InscricaoId) ?? "—")
            : "A definir";
          const vencedor: 0 | 1 | 2 = !l.vencedorInscricaoId
            ? 0
            : l.vencedorInscricaoId === l.atleta1InscricaoId
              ? 1
              : l.vencedorInscricaoId === l.atleta2InscricaoId
                ? 2
                : 0;
          return {
            label: `L${k + 1}`,
            hora,
            a1,
            a2,
            score1: l.pontos1,
            score2: l.pontos2,
            vantagens1: l.vantagens1,
            vantagens2: l.vantagens2,
            punicoes1: l.punicoes1,
            punicoes2: l.punicoes2,
            vencedor,
            decidida: Boolean(l.vencedorInscricaoId),
            metodo: l.metodo ? (ROTULO_METODO[l.metodo] ?? l.metodo) : null,
            finalizacao: l.nomeFinalizacao,
          };
        });
      } else {
        // sem chave: adianta o cursor pelas lutas estimadas para manter a
        // janela da coluna realista (nenhuma linha de luta é exibida)
        cursor += Math.max(0, nAtletas - 1) * dur;
      }

      return {
        grupoChave,
        faixa: c.faixa,
        titulo: `${c.faixa ? cap(c.faixa) : "—"} · ${rotuloPeso(c.nome, c.tipo)}`,
        subtitulo: `${nomeDaClasse(c.classeIdade)} · ${ROTULO_SEXO[c.sexo] ?? cap(c.sexo)} · ${nAtletas} atleta${nAtletas === 1 ? "" : "s"}`,
        hora: horaCategoria,
        nLutas: chaveGerada ? lutasCron.length : Math.max(0, nAtletas - 1),
        chaveGerada,
        atletas,
        lutas: lutasCron,
      };
    });

    return {
      id: area.id,
      nome: area.nome,
      dataLabel: dia,
      inicio: inicioDia,
      fim: horaLabel(cursor),
      totalCats: catsDaArea.length,
      totalGrupos: gruposVistos.size,
      categorias: categoriasCron,
    };
  });
}
