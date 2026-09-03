import type { Db } from "@/db";
import { estimarCargaCategorias } from "./carga-areas";
import { diasDoEventoOuDefault } from "./dias";
import { duracaoDaCategoria } from "./fila";
import {
  AREAS_MAX,
  verificarCapacidade,
  type CatCapacidade,
} from "./janelas";
import type { TemposLuta } from "./tempos";

/** categoria como a capacidade precisa dela (carga + demanda real), com id */
export interface EntradaCapacidade extends CatCapacidade {
  id: string;
  /** lutas estimadas da categoria (≈ confirmados − 1) */
  lutas: number;
}

type CategoriaDoEvento = {
  id: string;
  classeIdade: string;
  sexo: string;
  faixa: string | null;
  tipo: string;
  limitePesoKg: string | number | null;
  duracaoLutaSegundos: number | null;
};

type EventoParaCapacidade = {
  id: string;
  dataInicio: string;
  temposLuta: TemposLuta | null;
  ordemClasses: string[] | null;
};

/**
 * Monta as entradas do cálculo de capacidade: carga (com piso de 1 luta, que
 * equilibra a distribuição) e demanda real de tempo (lutas × duração da faixa,
 * sem piso). Compartilhado pelo gerador de áreas e pela recomendação da tela —
 * os dois precisam enxergar exatamente a mesma grade.
 */
export async function entradasDeCapacidade(
  db: Db,
  eventoId: string,
  cats: CategoriaDoEvento[],
  tempos: TemposLuta | null,
): Promise<EntradaCapacidade[]> {
  const cargas = await estimarCargaCategorias(db, eventoId, cats, tempos);
  return cats.map((c) => {
    const lutas = cargas.get(c.id)?.lutas ?? 0;
    return {
      id: c.id,
      classeIdade: c.classeIdade,
      sexo: c.sexo,
      faixa: c.faixa,
      tipo: c.tipo,
      limitePesoKg: c.limitePesoKg != null ? Number(c.limitePesoKg) : null,
      carga: cargas.get(c.id)?.carga ?? 1,
      lutas,
      demandaReal: lutas * duracaoDaCategoria(c, tempos),
    };
  });
}

/** o que o widget de recomendação mostra na tela de Áreas */
export interface RecomendacaoAreas {
  /** menor nº de tatames em que todas as lutas cabem no período; null se nem 40 resolvem */
  ideal: number | null;
  /** tatames planejados hoje (nº salvo no evento ou áreas já criadas); null se nenhum */
  atual: number | null;
  /** lutas estimadas das categorias com inscrição confirmada */
  lutasPrevistas: number;
  /** tempo somado de todas as lutas, em segundos */
  demandaTotalSegundos: number;
  /** janela de um tatame — Σ das janelas de todos os dias, em segundos */
  janelaPorAreaSegundos: number;
  /** tempo do tatame mais cheio com `ideal` tatames, em segundos */
  demandaNoIdealSegundos: number;
  /** ocupação da janela no cenário ideal (0–1) — quanto do dia o tatame usa */
  ocupacaoNoIdeal: number;
  /** true quando uma divisão sozinha estoura a janela: só mais dias/horas resolve */
  soAdicionandoTempo: boolean;
  /** as lutas cabem com os tatames de hoje? null quando ainda não há nº atual */
  cabeHoje: boolean | null;
  /** teto do seletor de áreas, para a mensagem de "nem com N resolve" */
  areasMax: number;
}

/**
 * Situação do evento diante da recomendação — decide o que o widget diz.
 *
 * - `semDados`: nenhuma luta estimada (sem inscrição confirmada)
 * - `impossivel`: nem o teto de tatames faz caber; só mais dias/horas resolve
 * - `comece`: ainda não há tatame planejado
 * - `faltam` / `sobram` / `bate`: planejado vs. ideal
 */
export type SituacaoRecomendacao =
  | "semDados"
  | "impossivel"
  | "comece"
  | "faltam"
  | "sobram"
  | "bate";

export function situacaoRecomendacao(
  r: Pick<RecomendacaoAreas, "ideal" | "atual" | "lutasPrevistas">,
): SituacaoRecomendacao {
  // sem luta estimada não há o que recomendar: "1 tatame" enganaria, porque o
  // número só ganha sentido quando existe inscrição confirmada
  if (r.lutasPrevistas === 0) return "semDados";
  if (r.ideal === null) return "impossivel";
  if (r.atual === null) return "comece";
  if (r.atual < r.ideal) return "faltam";
  if (r.atual > r.ideal) return "sobram";
  return "bate";
}

/**
 * Recomenda quantos tatames o evento precisa para que todas as lutas caibam
 * entre a hora de início e a de término dos dias configurados.
 *
 * Usa o mesmo motor que valida o "Estruturar" (`verificarCapacidade`), então a
 * recomendação nunca contradiz o bloqueio: o número recomendado aqui é o mesmo
 * que faz o gerador passar. Devolve null quando não há grade ou período para
 * medir.
 */
export async function recomendarAreas(
  db: Db,
  evento: EventoParaCapacidade,
  cats: CategoriaDoEvento[],
  /** tatames planejados hoje (evento.numAreas ou áreas já criadas) */
  atual: number | null,
): Promise<RecomendacaoAreas | null> {
  if (!cats.length) return null;

  const [entradas, janelas] = await Promise.all([
    entradasDeCapacidade(db, evento.id, cats, evento.temposLuta),
    diasDoEventoOuDefault(db, evento),
  ]);

  // `ideal` varre de 1 até o teto e não depende de `n`; o `n` daqui só serve
  // para responder se o arranjo de hoje cabe
  const n = atual && atual > 0 ? atual : 1;
  const cap = verificarCapacidade(entradas, n, janelas, evento.ordemClasses);
  if (cap.capacidadeAreaSegundos <= 0) return null;

  return {
    ideal: cap.areasIdeais,
    atual: atual && atual > 0 ? atual : null,
    lutasPrevistas: entradas.reduce((s, e) => s + e.lutas, 0),
    demandaTotalSegundos: cap.demandaTotalSegundos,
    janelaPorAreaSegundos: cap.capacidadeAreaSegundos,
    demandaNoIdealSegundos: cap.demandaNoIdealSegundos,
    ocupacaoNoIdeal:
      cap.demandaNoIdealSegundos / cap.capacidadeAreaSegundos,
    soAdicionandoTempo: cap.soAdicionandoTempo,
    cabeHoje: atual && atual > 0 ? cap.cabe : null,
    areasMax: AREAS_MAX,
  };
}
