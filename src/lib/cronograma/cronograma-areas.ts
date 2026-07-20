import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { areas, categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { chaveDoGrupo, nomeDaClasse } from "@/lib/categorias/distribuicao-areas";
import { idsDeBye } from "@/lib/chaves/byes";
import { duracaoDaCategoria } from "./fila";
import { diasDoEventoOuDefault } from "./dias";
import { encaixarComProgresso, type Ancora, type ItemProgresso } from "./janelas";
import { localizarNoEixo, paredeSegundos } from "./relogio";

/**
 * Cronograma de lutas por área para a seção **Áreas** do organizador.
 *
 * Para cada área, devolve suas categorias (na ordem do dia — `ordemNaArea`) com
 * o horário previsto de início e a lista de lutas. O horário respeita as
 * **janelas dos dias do evento** (cada dia com início/fim): cada área corre em
 * paralelo, enche a janela de um dia e, quando esgota, retoma no dia seguinte
 * (uma luta nunca parte no meio de um dia). Antes das chaves existirem, mostra a
 * lista de inscritos e estima o nº de lutas (`atletas − 1`) só para manter o
 * horário da coluna realista.
 *
 * Tudo é derivado do backend (áreas, categorias, chaves, lutas, inscrições
 * confirmadas e dias do evento). Rótulos já vêm formatados para o cliente
 * permanecer burro.
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

/** "YYYY-MM-DD" a partir do parâmetro de data de início (string ou Date) */
function dataInicioStr(data: string | Date): string {
  return typeof data === "string" ? data.slice(0, 10) : data.toISOString().slice(0, 10);
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
  /** dia da luta ("YYYY-MM-DD") — evento multi-dia */
  data: string;
  /** rótulo do dia ("14/03") */
  dataLabel: string;
  /** índice da janela (0-based) em que a luta cai — várias por dia (manhã/tarde) */
  diaIndex: number;
  /** nº do dia de calendário (1-based) — distinto de diaIndex (janelas) */
  diaNumero: number;
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
  /** dia de início da categoria ("YYYY-MM-DD") */
  data: string;
  /** rótulo do dia de início ("14/03") */
  dataLabel: string;
  /** índice da janela (0-based) em que a categoria começa */
  diaIndex: number;
  /** nº do dia de calendário (1-based) — distinto de diaIndex (janelas) */
  diaNumero: number;
  /** nº de lutas (real quando há chave; estimado — atletas−1 — quando não) */
  nLutas: number;
  /** true quando a chave já foi gerada (há lutas de verdade) */
  chaveGerada: boolean;
  /** inscritos confirmados (para o roster quando a chave não foi gerada) */
  atletas: string[];
  /** lutas da categoria (vazio quando a chave não foi gerada) */
  lutas: LutaCron[];
}

/** um dia usado pela área (para o header multi-dia) */
export interface DiaCron {
  /** "YYYY-MM-DD" */
  data: string;
  /** "14/03" */
  dataLabel: string;
  /** início real usado neste dia ("09:00") */
  inicio: string;
  /** fim real usado neste dia ("17:30") */
  fim: string;
}

/** uma coluna (área/tatame) do cronograma */
export interface AreaCron {
  id: string;
  nome: string;
  /** rótulo da data (um dia "14/03" ou faixa "14/03–15/03") */
  dataLabel: string;
  /** início previsto (do primeiro dia usado) */
  inicio: string;
  /** fim previsto (do último dia usado) */
  fim: string;
  /** dias que a área ocupa, com a janela real usada em cada um */
  dias: DiaCron[];
  totalCats: number;
  totalGrupos: number;
  categorias: CategoriaCron[];
  /**
   * O evento tem mais de um dia de calendário configurado. Sinaliza à
   * programação que mostre a data em cada luta mesmo quando, no modo "Por dia",
   * todas as lutas acabam caindo num único dia (senão a data sumiria).
   */
  eventoMultiDia?: boolean;
}

/** rótulo da faixa de datas de uma lista de dias (datas distintas: um dia com
 *  duas janelas não vira "14/03–14/03") */
function faixaDatasLabel(dias: DiaCron[]): string {
  const datas = [...new Set(dias.map((d) => d.dataLabel))];
  if (!datas.length) return "";
  if (datas.length === 1) return datas[0];
  return `${datas[0]}–${datas[datas.length - 1]}`;
}

/**
 * Monta o cronograma de todas as áreas do evento. Devolve `[]` quando não há
 * áreas estruturadas; colunas vazias quando há áreas mas nada alocado.
 */
export async function montarCronogramaDoEvento(
  db: Db,
  eventoId: string,
  dataInicio: string | Date,
  /** "agora" injetável (testes); reancora as lutas pendentes no tempo real */
  agora: Date = new Date(),
): Promise<AreaCron[]> {
  const todasAreas = await db.query.areas.findMany({
    where: eq(areas.eventoId, eventoId),
    orderBy: asc(areas.ordem),
  });
  if (!todasAreas.length) return [];

  const inicioStr = dataInicioStr(dataInicio);
  const janelas = await diasDoEventoOuDefault(db, {
    id: eventoId,
    dataInicio: inicioStr,
  });
  // nº do dia de calendário (1-based) por data — para os divisores multi-dia,
  // distinto do diaIndex (que conta janelas; um dia pode ter manhã e tarde)
  const diaNumeroPorData = new Map(
    [...new Set(janelas.map((j) => j.data))]
      .sort((a, b) => a.localeCompare(b))
      .map((d, i) => [d, i + 1] as const),
  );
  const diaNumeroDe = (data: string) => diaNumeroPorData.get(data) ?? 1;
  // evento com mais de um dia de calendário configurado: a programação mostra a
  // data em cada luta mesmo se, no modo "Por dia", tudo cair num só dia
  const eventoMultiDia = diaNumeroPorData.size > 1;
  // piso do dia fixado (modo "Por dia"): data → 1ª janela desse dia no eixo.
  // Uma categoria com `dataFixada` só começa a partir daqui (ver janelas.ts).
  const pisoPorData = new Map<string, Ancora>();
  janelas.forEach((j, i) => {
    if (!pisoPorData.has(j.data))
      pisoPorData.set(j.data, { diaIndex: i, segundos: j.inicioSegundos });
  });
  const pisoDaCategoria = (dataFixada: string | null): Ancora | null =>
    dataFixada ? (pisoPorData.get(dataFixada.slice(0, 10)) ?? null) : null;
  // dia default para colunas vazias (o header sempre mostra ao menos um dia)
  const diaVazio: DiaCron = {
    data: janelas[0].data,
    dataLabel: dataLabel(janelas[0].data),
    inicio: horaLabel(janelas[0].inicioSegundos),
    fim: horaLabel(janelas[0].inicioSegundos),
  };
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
      dataLabel: diaVazio.dataLabel,
      inicio: diaVazio.inicio,
      fim: diaVazio.fim,
      dias: [diaVazio],
      totalCats: 0,
      totalGrupos: 0,
      categorias: [],
      eventoMultiDia,
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

    // metadados por categoria + nº de "unidades de luta" (reais ou estimadas)
    const metaCats = catsDaArea.map((c) => {
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
      // sem chave: estima atletas−1 lutas só para o horário ficar realista
      const nUnidades = chaveGerada
        ? visiveis.length
        : Math.max(0, nAtletas - 1);
      return { c, dur, atletas, nAtletas, grupoChave, chaveGerada, visiveis, nUnidades };
    });

    // encaixa todas as unidades da área nas janelas, reancorando no tempo real:
    // lutas encerradas usam o término real (encerradaEm); as pendentes partem do
    // momento em que a área ficou livre (ou "agora"), somando a estimativa.
    const itens: ItemProgresso[] = [];
    for (const m of metaCats) {
      const pisoDia = pisoDaCategoria(m.c.dataFixada);
      if (m.chaveGerada) {
        for (const l of m.visiveis) {
          const fimReal = l.encerradaEm
            ? localizarNoEixo(janelas, paredeSegundos(l.encerradaEm))
            : null;
          itens.push({ duracao: m.dur, fimReal, pisoDia });
        }
      } else {
        // sem chave: unidades estimadas, sempre pendentes
        for (let k = 0; k < m.nUnidades; k++) {
          itens.push({ duracao: m.dur, fimReal: null, pisoDia });
        }
      }
    }
    const agoraPonto = localizarNoEixo(janelas, paredeSegundos(agora));
    const encaixe = encaixarComProgresso(janelas, itens, agoraPonto);

    // intervalo real usado por dia (para o header multi-dia)
    const porDia = new Map<number, { data: string; ini: number; fim: number }>();
    encaixe.forEach((e, i) => {
      // slot encerrado: o "fim" é o próprio horário real (não soma a estimativa)
      const fimItem = e.real ? e.inicioSegundos : e.inicioSegundos + itens[i].duracao;
      const cur = porDia.get(e.diaIndex);
      if (cur) {
        cur.ini = Math.min(cur.ini, e.inicioSegundos);
        cur.fim = Math.max(cur.fim, fimItem);
      } else {
        porDia.set(e.diaIndex, { data: e.data, ini: e.inicioSegundos, fim: fimItem });
      }
    });
    const dias: DiaCron[] =
      porDia.size > 0
        ? [...porDia.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => ({
              data: v.data,
              dataLabel: dataLabel(v.data),
              inicio: horaLabel(v.ini),
              fim: horaLabel(v.fim),
            }))
        : [diaVazio];

    // refatia o encaixe por categoria (na ordem)
    let ptr = 0;
    const categoriasCron: CategoriaCron[] = metaCats.map((m) => {
      const slotsCat = encaixe.slice(ptr, ptr + m.nUnidades);
      ptr += m.nUnidades;
      // início do bloco: 1ª unidade da categoria; se vazia, a posição seguinte
      const pos =
        slotsCat[0] ??
        encaixe[ptr] ??
        encaixe[encaixe.length - 1] ?? {
          diaIndex: 0,
          data: janelas[0].data,
          inicioSegundos: janelas[0].inicioSegundos,
        };

      let lutasCron: LutaCron[] = [];
      if (m.chaveGerada) {
        lutasCron = m.visiveis.map((l, k) => {
          const p = slotsCat[k] ?? pos;
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
            hora: horaLabel(p.inicioSegundos),
            data: p.data,
            dataLabel: dataLabel(p.data),
            diaIndex: p.diaIndex,
            diaNumero: diaNumeroDe(p.data),
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
      }

      return {
        grupoChave: m.grupoChave,
        faixa: m.c.faixa,
        titulo: `${m.c.faixa ? cap(m.c.faixa) : "—"} · ${rotuloPeso(m.c.nome, m.c.tipo)}`,
        subtitulo: `${nomeDaClasse(m.c.classeIdade)} · ${ROTULO_SEXO[m.c.sexo] ?? cap(m.c.sexo)} · ${m.nAtletas} atleta${m.nAtletas === 1 ? "" : "s"}`,
        hora: horaLabel(pos.inicioSegundos),
        data: pos.data,
        dataLabel: dataLabel(pos.data),
        diaIndex: pos.diaIndex,
        diaNumero: diaNumeroDe(pos.data),
        nLutas: m.chaveGerada ? lutasCron.length : Math.max(0, m.nAtletas - 1),
        chaveGerada: m.chaveGerada,
        atletas: m.atletas,
        lutas: lutasCron,
      };
    });

    return {
      id: area.id,
      nome: area.nome,
      dataLabel: faixaDatasLabel(dias),
      inicio: dias[0].inicio,
      fim: dias[dias.length - 1].fim,
      dias,
      totalCats: catsDaArea.length,
      totalGrupos: gruposVistos.size,
      categorias: categoriasCron,
      eventoMultiDia,
    };
  });
}
