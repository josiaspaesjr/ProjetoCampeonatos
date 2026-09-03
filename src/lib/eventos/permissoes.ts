/**
 * Permissões de colaborador — o que cada pessoa da equipe pode acessar dentro
 * do console do evento.
 *
 * Uma permissão = uma seção do console. O dono do evento tem todas, sempre;
 * colaborador tem só as que o dono liberou no convite. "Equipe" e "excluir
 * evento" continuam exclusivos do dono (não são permissões).
 */

/** Seções do console que podem ser liberadas para um colaborador. */
export const SECOES = [
  "evento",
  "inscricoes",
  "lotes",
  "categorias",
  "chaves",
  "areas",
  "checkin",
] as const;

export type Secao = (typeof SECOES)[number];

/**
 * Papéis prontos: atalhos que preenchem as seções no convite. Não são
 * gravados — o banco guarda só a lista de seções; o papel é derivado de volta
 * por `papelDe` para exibir o rótulo na lista da equipe.
 */
export const PAPEIS = {
  total: SECOES,
  mesario: ["chaves", "areas"],
  recepcao: ["checkin", "inscricoes"],
} as const satisfies Record<string, readonly Secao[]>;

export type Papel = keyof typeof PAPEIS;

/** ordem de exibição dos papéis no seletor do convite */
export const ORDEM_PAPEIS: Papel[] = ["total", "mesario", "recepcao"];

/**
 * Sanitiza o que veio do banco ou do formulário: mantém só seções conhecidas,
 * sem repetir, na ordem canônica de `SECOES`.
 *
 * `null`/`undefined` = acesso total — é o caso dos convites criados antes das
 * permissões existirem, que não podem perder acesso numa migração.
 */
export function normalizarPermissoes(valor: unknown): Secao[] {
  if (valor == null) return [...SECOES];
  if (!Array.isArray(valor)) return [];
  const pedidas = new Set(valor.filter((v): v is string => typeof v === "string"));
  return SECOES.filter((s) => pedidas.has(s));
}

/** true se a lista libera a seção. */
export function temAcesso(permissoes: readonly Secao[], secao: Secao): boolean {
  return permissoes.includes(secao);
}

/** Papel correspondente à lista exata de seções, ou null (= personalizado). */
export function papelDe(permissoes: readonly Secao[]): Papel | null {
  return (
    ORDEM_PAPEIS.find((papel) => {
      const preset = PAPEIS[papel];
      return (
        preset.length === permissoes.length &&
        preset.every((s) => permissoes.includes(s))
      );
    }) ?? null
  );
}

/**
 * Seções marcadas num formulário (checkboxes `name="permissoes"`). Os papéis
 * são só atalhos na interface — o que vai para o banco é sempre a lista de
 * seções.
 */
export function permissoesDoForm(formData: FormData): Secao[] {
  return normalizarPermissoes(formData.getAll("permissoes").map(String));
}

/** Sufixo da rota de cada seção dentro de `/organizador/eventos/[id]`. */
export const ROTA_SECAO: Record<Secao, string> = {
  evento: "",
  inscricoes: "/inscricoes",
  lotes: "/lotes",
  categorias: "/categorias",
  chaves: "/chaves",
  areas: "/areas",
  checkin: "/checkin",
};

/**
 * Primeira seção liberada, na ordem do menu — destino de quem entra no evento
 * sem permissão para a visão geral (ex.: mesário cai direto nas chaves).
 */
export function primeiraSecao(
  permissoes: readonly Secao[],
): Secao | undefined {
  return SECOES.find((s) => permissoes.includes(s));
}
