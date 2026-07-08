/**
 * Gerador de grade de categorias no padrão CBJJ/IBJJF (com kimono).
 *
 * Cobre Juvenil, Adulto e Masters 1–7. Categorias Kids têm grade própria por
 * ano de idade — na Fase 1 são criadas manualmente como categorias custom.
 *
 * ATENÇÃO: limites de peso conferidos com a tabela oficial vigente devem ser
 * revisados pelo organizador antes de publicar o evento — a tabela é editável.
 */

export type Sexo = "masculino" | "feminino";

export type Faixa =
  | "branca"
  | "azul"
  | "roxa"
  | "marrom"
  | "preta";

export interface ClasseIdade {
  id: string;
  nome: string;
  idadeMin: number;
  idadeMax: number | null;
  faixas: Faixa[];
}

export const CLASSES_IDADE: ClasseIdade[] = [
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

export function tabelaPesos(classeId: string, sexo: Sexo): CategoriaPeso[] {
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
