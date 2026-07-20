/**
 * Catálogo dos formatos de chave — fonte única de metadados.
 *
 * Módulo PURO (sem banco nem framework), então pode ser importado tanto no
 * servidor (persistência, validação) quanto no client (seletor de formato).
 * As descrições legíveis ficam no i18n (dic.admin.chaves.formatos[id]); aqui
 * moram só a estrutura, os limites de atletas e o que já tem motor.
 */

/** Formatos concretos — casam 1:1 com o enum chave_formato do banco. */
export type FormatoChaveId =
  | "eliminacao_simples"
  | "eliminacao_dupla"
  | "round_robin"
  | "melhor_de_tres"
  | "tres_repescagem"
  | "colocacao"
  | "multistage"
  | "votacao_jurados";

/** O que o organizador pode escolher: um formato concreto ou "automático". */
export type FormatoSelecionavel = FormatoChaveId | "auto";

export interface FormatoMeta {
  id: FormatoChaveId;
  /** já tem motor de geração? controla se o card fica selecionável ou "em breve" */
  implementado: boolean;
  /** mínimo de atletas para o formato fazer sentido */
  minAtletas: number;
  /** máximo de atletas (undefined = sem limite) */
  maxAtletas?: number;
}

/**
 * Ordem do catálogo = ordem exibida no seletor (espelha a referência Smoothcomp).
 * Ao concluir cada fase, vire `implementado: true` no formato correspondente.
 */
export const FORMATOS: readonly FormatoMeta[] = [
  { id: "eliminacao_simples", implementado: true, minAtletas: 2 },
  { id: "eliminacao_dupla", implementado: true, minAtletas: 3 },
  // "Em breve": motor existe mas o comportamento ainda não está redondo.
  // Enquanto isso, as divisões pequenas caem no "Automático" (eliminação simples).
  { id: "round_robin", implementado: false, minAtletas: 2 },
  { id: "tres_repescagem", implementado: true, minAtletas: 3, maxAtletas: 3 },
  { id: "multistage", implementado: true, minAtletas: 6 },
  { id: "votacao_jurados", implementado: true, minAtletas: 2 },
  { id: "colocacao", implementado: true, minAtletas: 2 },
  { id: "melhor_de_tres", implementado: true, minAtletas: 2, maxAtletas: 2 },
] as const;

const POR_ID = new Map(FORMATOS.map((f) => [f.id, f]));

export function formatoMeta(id: FormatoChaveId): FormatoMeta {
  const meta = POR_ID.get(id);
  if (!meta) throw new Error(`Formato desconhecido: ${id}`);
  return meta;
}

/** true quando o formato tem motor e comporta essa quantidade de atletas. */
export function formatoDisponivel(meta: FormatoMeta, qtdAtletas: number): boolean {
  if (!meta.implementado) return false;
  if (qtdAtletas < meta.minAtletas) return false;
  if (meta.maxAtletas != null && qtdAtletas > meta.maxAtletas) return false;
  return true;
}

/**
 * Regra automática de formato: eliminação simples para qualquer tamanho de
 * divisão. (1 atleta vira campeão por W.O. antes de chegar aqui.)
 *
 * Enquanto "todos contra todos" (round_robin) está em breve, ele fica fora do
 * automático — e as divisões pequenas, que antes iam para round robin, agora
 * seguem o mesmo formato de todas as outras.
 *
 * Função pura (sem banco), reaproveitada pelo seletor para mostrar o que o
 * "Automático" escolheria e pela persistência ao resolver formato "auto".
 */
export function formatoAutomatico(): "eliminacao_simples" {
  return "eliminacao_simples";
}
