/**
 * cn() no padrão shadcn, sem dependências.
 *
 * Além de concatenar classes truthy, resolve conflitos de utilitários
 * Tailwind nos grupos que os componentes ui/ usam como default (altura,
 * largura, padding, tamanho de fonte): a ÚLTIMA ocorrência vence, imitando
 * o comportamento do tailwind-merge para esses casos.
 */
export type ClassValue = string | false | null | undefined;

const GRUPOS: [string, RegExp][] = [
  ["h", /^h-\S+$/],
  ["w", /^w-\S+$/],
  ["p", /^p-\S+$/],
  ["px", /^px-\S+$/],
  ["py", /^py-\S+$/],
  ["text-size", /^text-(xs|sm|base|lg|xl|[2-9]xl)$/],
  ["rounded", /^rounded(-(sm|md|lg|xl|2xl|3xl|full|none))?$/],
];

function grupoDe(cls: string): string | null {
  for (const [nome, re] of GRUPOS) {
    if (re.test(cls)) return nome;
  }
  return null;
}

export function cn(...classes: ClassValue[]): string {
  const todas = classes.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  const vencedorPorGrupo = new Map<string, string>();
  for (const cls of todas) {
    const grupo = grupoDe(cls);
    if (grupo) vencedorPorGrupo.set(grupo, cls);
  }

  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const cls of todas) {
    if (vistas.has(cls)) continue;
    const grupo = grupoDe(cls);
    if (grupo && vencedorPorGrupo.get(grupo) !== cls) continue;
    vistas.add(cls);
    resultado.push(cls);
  }
  return resultado.join(" ");
}
