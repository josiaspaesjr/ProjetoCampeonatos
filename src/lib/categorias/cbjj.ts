/**
 * Gerador de grade de categorias no padrão CBJJ/IBJJF (com kimono).
 *
 * Cobre Kids (Pré-Mirim a Infanto-Juvenil), Juvenil, Adulto e Masters 1–7.
 *
 * Faixas infantis seguem a progressão IBJJF: cinza (4+), amarela (7+),
 * laranja (10+), verde (13+) — cada classe de idade só aceita as faixas
 * permitidas para ela.
 *
 * ATENÇÃO: limites de peso conferidos com a tabela oficial vigente devem ser
 * revisados pelo organizador antes de publicar o evento — a tabela é editável.
 */

export type Sexo = "masculino" | "feminino";

export type Faixa =
  | "branca"
  | "cinza"
  | "amarela"
  | "laranja"
  | "verde"
  | "azul"
  | "roxa"
  | "marrom"
  | "preta";

/** ordem de exibição nos formulários (kids → adulto) */
export const FAIXAS: Faixa[] = [
  "branca",
  "cinza",
  "amarela",
  "laranja",
  "verde",
  "azul",
  "roxa",
  "marrom",
  "preta",
];

export interface ClasseIdade {
  id: string;
  nome: string;
  idadeMin: number;
  idadeMax: number | null;
  faixas: Faixa[];
}

export const CLASSES_IDADE: ClasseIdade[] = [
  { id: "pre_mirim", nome: "Pré-Mirim", idadeMin: 4, idadeMax: 6, faixas: ["branca", "cinza"] },
  { id: "mirim", nome: "Mirim", idadeMin: 7, idadeMax: 9, faixas: ["branca", "cinza", "amarela"] },
  { id: "infantil", nome: "Infantil", idadeMin: 10, idadeMax: 12, faixas: ["branca", "cinza", "amarela", "laranja"] },
  { id: "infanto_juvenil", nome: "Infanto-Juvenil", idadeMin: 13, idadeMax: 15, faixas: ["branca", "cinza", "amarela", "laranja", "verde"] },
  { id: "juvenil", nome: "Juvenil", idadeMin: 16, idadeMax: 17, faixas: ["branca", "azul"] },
  { id: "adulto", nome: "Adulto", idadeMin: 18, idadeMax: null, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master1", nome: "Master 1", idadeMin: 30, idadeMax: 35, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master2", nome: "Master 2", idadeMin: 36, idadeMax: 40, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master3", nome: "Master 3", idadeMin: 41, idadeMax: 45, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master4", nome: "Master 4", idadeMin: 46, idadeMax: 50, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master5", nome: "Master 5", idadeMin: 51, idadeMax: 55, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master6", nome: "Master 6", idadeMin: 56, idadeMax: 60, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
  { id: "master7", nome: "Master 7", idadeMin: 61, idadeMax: null, faixas: ["branca", "azul", "roxa", "marrom", "preta"] },
];

export interface CategoriaPeso {
  nome: string;
  /** limite em kg com kimono; null = sem limite (pesadíssimo) */
  limiteKg: number | null;
}

/** Adulto/Master masculino, com kimono (tabela IBJJF) */
const PESOS_MASCULINO: CategoriaPeso[] = [
  { nome: "Galo", limiteKg: 57.5 },
  { nome: "Pluma", limiteKg: 64.0 },
  { nome: "Pena", limiteKg: 70.0 },
  { nome: "Leve", limiteKg: 76.0 },
  { nome: "Médio", limiteKg: 82.3 },
  { nome: "Meio-Pesado", limiteKg: 88.3 },
  { nome: "Pesado", limiteKg: 94.3 },
  { nome: "Super-Pesado", limiteKg: 100.5 },
  { nome: "Pesadíssimo", limiteKg: null },
];

/** Adulto/Master feminino, com kimono (tabela IBJJF) */
const PESOS_FEMININO: CategoriaPeso[] = [
  { nome: "Galo", limiteKg: 48.5 },
  { nome: "Pluma", limiteKg: 53.5 },
  { nome: "Pena", limiteKg: 58.5 },
  { nome: "Leve", limiteKg: 64.0 },
  { nome: "Médio", limiteKg: 69.0 },
  { nome: "Meio-Pesado", limiteKg: 74.0 },
  { nome: "Pesado", limiteKg: 79.3 },
  { nome: "Super-Pesado", limiteKg: null },
];

/** Juvenil masculino, com kimono (tabela IBJJF) */
const PESOS_JUVENIL_MASCULINO: CategoriaPeso[] = [
  { nome: "Galo", limiteKg: 53.5 },
  { nome: "Pluma", limiteKg: 58.5 },
  { nome: "Pena", limiteKg: 64.0 },
  { nome: "Leve", limiteKg: 69.0 },
  { nome: "Médio", limiteKg: 74.0 },
  { nome: "Meio-Pesado", limiteKg: 79.3 },
  { nome: "Pesado", limiteKg: 84.3 },
  { nome: "Super-Pesado", limiteKg: 89.3 },
  { nome: "Pesadíssimo", limiteKg: null },
];

/** Juvenil feminino, com kimono (tabela IBJJF) */
const PESOS_JUVENIL_FEMININO: CategoriaPeso[] = [
  { nome: "Galo", limiteKg: 44.3 },
  { nome: "Pluma", limiteKg: 48.3 },
  { nome: "Pena", limiteKg: 52.5 },
  { nome: "Leve", limiteKg: 56.5 },
  { nome: "Médio", limiteKg: 60.5 },
  { nome: "Meio-Pesado", limiteKg: 65.0 },
  { nome: "Pesado", limiteKg: 69.0 },
  { nome: "Super-Pesado", limiteKg: null },
];

/**
 * Kids: tabela única por classe de idade (masculino e feminino), prática
 * comum em eventos regionais — o organizador ajusta/remove o que não usar.
 */
const PESOS_KIDS: Record<string, CategoriaPeso[]> = {
  pre_mirim: [
    { nome: "Galo", limiteKg: 18.0 },
    { nome: "Pluma", limiteKg: 21.0 },
    { nome: "Pena", limiteKg: 24.0 },
    { nome: "Leve", limiteKg: 27.0 },
    { nome: "Médio", limiteKg: 30.0 },
    { nome: "Pesado", limiteKg: 33.0 },
    { nome: "Super-Pesado", limiteKg: null },
  ],
  mirim: [
    { nome: "Galo", limiteKg: 24.0 },
    { nome: "Pluma", limiteKg: 27.0 },
    { nome: "Pena", limiteKg: 30.0 },
    { nome: "Leve", limiteKg: 33.0 },
    { nome: "Médio", limiteKg: 36.0 },
    { nome: "Meio-Pesado", limiteKg: 39.0 },
    { nome: "Pesado", limiteKg: 42.0 },
    { nome: "Super-Pesado", limiteKg: null },
  ],
  infantil: [
    { nome: "Galo", limiteKg: 30.0 },
    { nome: "Pluma", limiteKg: 33.5 },
    { nome: "Pena", limiteKg: 37.0 },
    { nome: "Leve", limiteKg: 40.5 },
    { nome: "Médio", limiteKg: 44.0 },
    { nome: "Meio-Pesado", limiteKg: 47.5 },
    { nome: "Pesado", limiteKg: 51.0 },
    { nome: "Super-Pesado", limiteKg: 54.5 },
    { nome: "Pesadíssimo", limiteKg: null },
  ],
  infanto_juvenil: [
    { nome: "Galo", limiteKg: 40.0 },
    { nome: "Pluma", limiteKg: 44.0 },
    { nome: "Pena", limiteKg: 48.0 },
    { nome: "Leve", limiteKg: 52.5 },
    { nome: "Médio", limiteKg: 57.0 },
    { nome: "Meio-Pesado", limiteKg: 61.5 },
    { nome: "Pesado", limiteKg: 66.0 },
    { nome: "Super-Pesado", limiteKg: 70.5 },
    { nome: "Pesadíssimo", limiteKg: null },
  ],
};

export function tabelaPesos(classeId: string, sexo: Sexo): CategoriaPeso[] {
  if (PESOS_KIDS[classeId]) return PESOS_KIDS[classeId];
  if (classeId === "juvenil") {
    return sexo === "masculino" ? PESOS_JUVENIL_MASCULINO : PESOS_JUVENIL_FEMININO;
  }
  return sexo === "masculino" ? PESOS_MASCULINO : PESOS_FEMININO;
}

export interface CategoriaGerada {
  nome: string;
  tipo: "peso" | "absoluto";
  sexo: Sexo;
  faixa: Faixa;
  classeIdade: string;
  idadeMin: number;
  idadeMax: number | null;
  limitePesoKg: number | null;
}

export interface SelecaoGrade {
  classes: string[];
  sexos: Sexo[];
  faixas: Faixa[];
  incluirAbsoluto: boolean;
}

const rotuloSexo: Record<Sexo, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** produto cartesiano classes × sexos × faixas × pesos da seleção */
export function gerarGrade(selecao: SelecaoGrade): CategoriaGerada[] {
  const resultado: CategoriaGerada[] = [];

  for (const classeId of selecao.classes) {
    const classe = CLASSES_IDADE.find((c) => c.id === classeId);
    if (!classe) continue;

    for (const sexo of selecao.sexos) {
      for (const faixa of selecao.faixas) {
        if (!classe.faixas.includes(faixa)) continue;

        for (const peso of tabelaPesos(classeId, sexo)) {
          resultado.push({
            nome: `${classe.nome} / ${rotuloSexo[sexo]} / ${capitalizar(faixa)} / ${peso.nome}${peso.limiteKg ? ` (até ${peso.limiteKg}kg)` : ""}`,
            tipo: "peso",
            sexo,
            faixa,
            classeIdade: classeId,
            idadeMin: classe.idadeMin,
            idadeMax: classe.idadeMax,
            limitePesoKg: peso.limiteKg,
          });
        }

        if (selecao.incluirAbsoluto) {
          resultado.push({
            nome: `${classe.nome} / ${rotuloSexo[sexo]} / ${capitalizar(faixa)} / Absoluto`,
            tipo: "absoluto",
            sexo,
            faixa,
            classeIdade: classeId,
            idadeMin: classe.idadeMin,
            idadeMax: classe.idadeMax,
            limitePesoKg: null,
          });
        }
      }
    }
  }

  return resultado;
}
